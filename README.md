# 🎴 Multiplayer 29 Card Game

A real-time, multiplayer implementation of the classic South Asian trick-taking card game "29" (Twenty-Nine). Built with **Node.js** and **Socket.io**, allowing 4 players to join a lobby and play together instantly from any device.

🔗 **[Play the Live Demo Here](https://game-29-live.onrender.com)** *(Note: You need 4 players to start the game. Open 4 tabs to test alone!)*

---

## 🚀 Features

* **Real-Time Multiplayer:** Instant card movement and updates using WebSockets.
* **Full Game Logic:**
    * **Bidding System:** Players bid (16-28) to decide the target.
    * **Hidden Trump:** The winner picks a trump suit which remains hidden until revealed.
    * **Trump Reveal Mechanic:** Players can request to reveal the trump if they cannot follow suit.
    * **Marriage (Pair) Rule:** King & Queen of the trump suit awards +4 points.
* **Anti-Cheat:** Server-side validation ensures players must follow suit.
* **Auto-Play Timer:** If a player is AFK for 30 seconds, the server makes a random valid move to keep the game going.
* **In-Game Chat:** Live chat feature for players to communicate.
* **Scoreboard:** Tracks team scores (Team A vs Team B) and game points.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Real-time Engine:** Socket.io
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Deployment:** Render (Web Service)

---

## 📸 How to Run Locally

If you want to run this game on your own computer:

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/game-29-live.git](https://github.com/YOUR_USERNAME/game-29-live.git)
    cd game-29-live
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Server**
    ```bash
    node server.js
    ```

4.  **Play**
    * Open your browser and visit `http://localhost:3000`.
    * Open 3 extra tabs to simulate 4 players.

---

## 🎮 Game Rules (29)

1.  **Teams:** Player 1 & 3 vs. Player 2 & 4.
2.  **Values:** J=3, 9=2, A=1, 10=1, K/Q/8/7=0.
3.  **Bidding:** The highest bidder chooses the "Trump" suit, which stays hidden.
4.  **Play:** You must follow the suit of the first card played. If you don't have it, you can reveal the Trump to try and win the trick.
5.  **Winning:** The bidding team must reach their bid target (e.g., 16 points). If they fail, the opponents win.

---

## 🔮 Future Improvements

* [ ] Private Rooms (Create/Join Code)
* [ ] Better Mobile UI (Responsive Design)
* [ ] User Accounts & Persistent Stats
* [ ] Animations for card dealing

---

**Developed by Souvik Das** *Built for fun *
