import { useEffect, useState, useRef } from "react";
import { RealtimeClient } from "@upstash/realtime";

const MAX_USERS = 10;
const MAX_MESSAGES = 100;

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username] = useState("user_" + Math.floor(Math.random() * 100000));
  const [count, setCount] = useState(0);
  const [typingUser, setTypingUser] = useState(null);
  const [status, setStatus] = useState("connecting");
  const channelRef = useRef(null);

  useEffect(() => {
    const client = new RealtimeClient({
      url: process.env.NEXT_PUBLIC_UPSTASH_WS_URL,
      token: process.env.NEXT_PUBLIC_UPSTASH_WS_TOKEN,
    });

    const channel = client.channel("anon-chat");
    channelRef.current = channel;

    // Join channel
    channel.publish({ type: "join", user: username });

    // Subscribe to events
    channel.subscribe((event) => {
      switch (event.type) {
        case "message":
          setMessages((prev) => {
            const newMessages = [...prev, event.data];
            if (newMessages.length > MAX_MESSAGES) newMessages.shift();
            return newMessages;
          });
          break;
        case "typing":
          setTypingUser(event.data.user);
          break;
        case "count":
          setCount(event.data);
          // Enforce max users
          if (event.data > MAX_USERS) setStatus("waiting");
          else setStatus("chat");
          break;
        case "reset":
          window.location.reload();
          break;
        default:
          break;
      }
    });

    return () => {
      channel.publish({ type: "leave", user: username });
      channel.unsubscribe();
    };
  }, [username]);

  if (status === "waiting") {
    return <div className="center">Room full. Please wait…</div>;
  }

  if (status !== "chat") {
    return <div className="center">Connecting…</div>;
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    channelRef.current.publish({
      type: "message",
      data: { user: username, text: input, time: Date.now() },
    });
    channelRef.current.publish({ type: "typing", data: { user: username, typing: false } });
    setInput("");
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    channelRef.current.publish({ type: "typing", data: { user: username, typing: true } });
  };

  return (
    <div className="container">
      <header>
        <span>{username}</span>
        <span>{count}/10 online</span>
      </header>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className="msg">
            <b>{m.user}</b>: {m.text}
          </div>
        ))}
        {typingUser && <div className="typing">{typingUser} is typing…</div>}
      </div>

      <form onSubmit={handleSend}>
        <input
          value={input}
          onChange={handleTyping}
          placeholder="Type a message"
        />
      </form>
    </div>
  );
}
