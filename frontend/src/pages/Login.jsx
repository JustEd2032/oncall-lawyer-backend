import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // 🔥 Get Firebase token
    const token = await user.getIdToken();

    // 🔥 Sync user profile with backend
    await axios.post(
      "http://localhost:8080/users",
      {}, // send empty body for login
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // 🔥 Force refresh token (important if backend sets custom claims)
    await user.getIdToken(true);

    console.log("User synced successfully");

    // OPTIONAL: test protected route
    const response = await axios.get(
      "http://localhost:8080/protected",
      {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      }
    );

    console.log("Backend response:", response.data);

  } catch (error) {
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  }
  
};


  return (
    <div>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
