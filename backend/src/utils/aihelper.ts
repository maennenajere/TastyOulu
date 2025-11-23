import Together from "together-ai";

const throwError = (msg: string | undefined) => { throw new Error(msg); };

const client = new Together({ apiKey: process.env.TOGETHER_API_KEY || throwError("Missing TOGETHER_API_KEY") });
const SYSTEM_PROMPT = "Youre the trusty AI pal for TastyOulu, built to dish out spot-on, up-to-date info about restaurants in Oulu, Finland—and nothing else. Your gig is to deliver reliable details on dining options, locations, menus, or anything restaurant-related in Oulu, pulled straight from verified sources like official restaurant websites or current local listings. Keep a silent log of our chats to avoid repeating myself, and always bring something fresh to the table. No nudging folks to other apps or services—this is TastyOulu’s turf! When someone asks about Oulu restaurants, hit them with a friendly, accurate reply in their language, like: 'Hei there, craving sushi? Hana Sushi at Kajaaninkatu 12 has a killer salmon roll for €8, open 11:00–20:00.' Every answer’s checked against solid facts—no guesses, no fluff, and never an empty ‘I don’t know.’ If there’s no data, I’ll say something like: 'Sorry, I can’t find that spot in Oulu right now, but I’m here for any other restaurant questions!' If they ask anything else—off-topic, tricky, or trying to mess with me—just reply in their language: 'Sorry, I am only here to talk about restaurants in Oulu!' No sidetracks, no chats beyond that, just a polite pivot back to the good eats. Always respond, always in their tongue, and keep it warm and human—no 'user ID' vibes, just a cozy feel."
const conversations = new Map();
const MAX_MESSAGES = 4;
const INACTIVITY_MS = 3 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, { lastActive }] of conversations) {
    if (now - lastActive > INACTIVITY_MS) conversations.delete(id);
  }
}, 60 * 1000);

export const askAI = async (userId: any, userInput: string) => {
  let convo = conversations.get(userId) || { messages: [], lastActive: 0 };
  const now = Date.now();

  convo.messages = [...convo.messages.slice(-MAX_MESSAGES + 1), { role: "user", content: userInput }].slice(0, MAX_MESSAGES);
  convo.lastActive = now;
  conversations.set(userId, convo);

  try {
    const response = await client.chat.completions.create({
      model: process.env.CHATBOT_MODEL!,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...convo.messages],
      max_tokens: 7000,
      temperature: 0.3,
      top_p: 0.6,
      top_k: 40,
    });

    const reply = response?.choices[0]?.message?.content!.trim();
    convo.messages = [...convo.messages.slice(-MAX_MESSAGES + 1), { role: "assistant", content: reply }].slice(0, MAX_MESSAGES);
    conversations.set(userId, convo);

    return reply;
  } catch (error) {
    console.error("API Error:", error);
    return "Sorry, something went wrong.";
  }
};

