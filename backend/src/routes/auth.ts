import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';
import { generateToken, verifyToken } from '../utils/auth.js';
import { sendEmail } from '../utils/emailer.js';

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ResetPassword {
  email: string;
}

interface ChangePassword {
  email: string;
  oldPassword: string;
  newPassword: string;
}

interface DeleteBody {
  email: string;
}

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: RegisterBody }>('/register', async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
    try {
      const { username, email, password } = request.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({ message: 'User with this email already exists' });
      }

      const lastUser = await User.findOne().sort({ userId: -1 });
      const newUserId = lastUser ? lastUser.userId + 1 : 1;

      const user = new User({
        userId: newUserId,
        username,
        email,
        password,
        avatar: `https://api.dicebear.com/7.x/pixel-art/png?seed=${username}`
      });

      await user.save();

      const token = generateToken(user.userId);

      return reply.status(201).send({ message: 'User registered successfully', token });
    } catch (error) {
      return reply.status(500).send({ message: 'Error registering user', error });
    }
  });

  fastify.post<{ Body: ResetPassword }>('/reset', async (request: FastifyRequest<{ Body: ResetPassword }>, reply: FastifyReply) => {
    try {
      const { email } = request.body;

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return reply.status(400).send({ message: 'User with this email does not exist' });
      }

      const salt = await bcrypt.genSalt(10);
      const newPassword = randomBytes(10).toString('base64')
      const password = await bcrypt.hash(newPassword, salt);

      await User.updateOne({ email: email }, { password: password });

      if (!(await sendEmail(existingUser.email, `Your new password is: ${newPassword}\nUse it to login.`, 'Password has been reset.')))
        throw 'Email failed to send'

      return reply.status(201).send({ message: 'Password reset success'});
    } catch (error) {
      return reply.status(500).send({ message: 'Error resetting user', error });
    }
  });

  fastify.delete<{ Body: DeleteBody }>(
    '/delete',
    async (request: FastifyRequest<{ Body: DeleteBody }>, reply: FastifyReply) => {
      try {
        const { email } = request.body;

        if (!email) {
            return reply.status(400).send({ message: 'Email is required in the request body' });
        }

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
          return reply.status(404).send({ message: 'User with this email not found' });
        }

        await User.deleteOne({ email });

        return reply.status(200).send({ message: 'User deleted successfully' });

      } catch (error) {
        fastify.log.error(`Error deleting user with email ${request.body?.email}: ${error}`);

        return reply.status(500).send({ message: 'Error deleting user', error: error });
      }
    }
  );

  fastify.post<{ Body: ChangePassword }>('/change-password', async (
    request: FastifyRequest<{ Body: ChangePassword }>,
    reply: FastifyReply
  ) => {
    try {
      const { email, oldPassword, newPassword } = request.body;
  
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return reply.status(400).send({ message: "User with this email does not exist" });
      }
  
      const isOldPasswordValid = await bcrypt.compare(oldPassword, existingUser.password);
      if (!isOldPasswordValid) {
        return reply.status(401).send({ message: "Incorrect old password" });
      }
  
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);
  
      await User.updateOne({ email }, { password: hashedNewPassword });
  
      const emailMessage = `Your password has been successfully changed.\nNew Password: ${newPassword}\nPlease keep it safe.`;
      const emailResult = await sendEmail(existingUser.email, emailMessage, "Password Changed");
      if (!emailResult) {
        throw new Error("Email failed to send");
      }
  
      return reply.status(200).send({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password Change Error:", error);
      return reply.status(500).send({ message: "Error changing password", error });
    }
  });

  fastify.post<{ Body: LoginBody }>('/login', async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body;

      const user = await User.findOne({ email });
      if (!user) {
        return reply.status(400).send({ message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return reply.status(400).send({ message: 'Invalid email or password' });
      }

      const token = generateToken(user.userId);

      return reply.status(200).send({ message: 'Login successful', token });
    } catch (error) {
      return reply.status(500).send({ message: 'Error logging in', error });
    }
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Authorization token required' });
      }

      const token = authHeader.split(' ')[1];
      try {
        verifyToken(token);
      } catch (error) {
        return reply.status(401).send({ message: 'Invalid or expired token' });
      }

      return reply.status(200).send({ message: 'Logout successful' });
    } catch (error) {
      return reply.status(500).send({ message: 'Error logging out', error });
    }
  });
};