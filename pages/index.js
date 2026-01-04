import { useEffect, useState } from "react";
import io from "socket.io-client";

let socket;

export default function Home() {
  const [status, setStatus] = useState("connecting");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [count, setCount] = useState(0);
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    fetch("/api/socket");
    socket = io();

    socket.on("init", (data) => {
      setUsername(data.username);
      setMessages(data.messages);
      setStatus("chat");
    });

    socket.on("msg", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("count", setCount);

    socket.on("typing", ({ user, isTyping }) => {
      setTypingUser(isTyping ? user : null);
    });

    socket.on("full", () => setStatus("waiting"));
    socket.on("reset", () => window.location.reload());

    return () => socket.disconnect();
  }, []);

  if (status === "waiting") {
    return <div className="center">Room full. Please wait…</div>;
  }

  if (status !== "chat") {
    return <div className="center">Connecting…</div>;
  }

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
        {typingUser && (
          <div className="typing">{typingUser} is typing…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          socket.emit("msg", input);
          socket.emit("typing", false);
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            socket.emit("typing", true);
          }}
          placeholder="Type a message"
        />
      </form>
    </div>
  );
}
