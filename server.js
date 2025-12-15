const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// --- GLOBAL VARIABLES ---
let players = {};
let deck = [];
let playerIds = [];
let gameState = 'WAITING'; // WAITING, BIDDING, TRUMP_SELECT, PLAYING
let turnIndex = 0;
let currentBid = 16;
let bidWinner = null;
let bidderTeam = null; // 'A' or 'B'
let trumpSuit = null;
let trumpRevealed = false;
let currentTrick = [];
let leadSuit = null;
let tricksPlayed = 0;
let teamScores = { 'A': 0, 'B': 0 };
let gamePoints = { 'A': 0, 'B': 0 };
let turnTimer = null;

// --- CONSTANTS & HELPERS ---
const CARD_VALUES = { 'J': 3, '9': 2, 'A': 1, '10': 1, 'K': 0, 'Q': 0, '8': 0, '7': 0 };
const CARD_RANK = { 'J': 8, '9': 7, 'A': 6, '10': 5, 'K': 4, 'Q': 3, '8': 2, '7': 1 };

function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let newDeck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            newDeck.push({ suit, rank });
        }
    }
    return newDeck.sort(() => Math.random() - 0.5);
}

function getTeam(socketId) {
    const index = playerIds.indexOf(socketId);
    return (index === 0 || index === 2) ? 'A' : 'B';
}

function calculatePoints(cards) {
    return cards.reduce((acc, card) => acc + CARD_VALUES[card.rank], 0);
}

function determineTrickWinner(trick, trump) {
    let lead = trick[0].card.suit;
    let winner = trick[0];

    for (let i = 1; i < trick.length; i++) {
        let current = trick[i];
        let wCard = winner.card;
        let cCard = current.card;

        if (cCard.suit === trump && wCard.suit !== trump) {
            winner = current;
        } else if (cCard.suit === trump && wCard.suit === trump) {
            if (CARD_RANK[cCard.rank] > CARD_RANK[wCard.rank]) winner = current;
        } else if (cCard.suit === lead && wCard.suit === lead) {
            if (CARD_RANK[cCard.rank] > CARD_RANK[wCard.rank]) winner = current;
        }
    }
    return winner;
}

// --- TIMER LOGIC ---
function startTurnTimer() {
    if (turnTimer) clearTimeout(turnTimer);
    if (gameState !== 'PLAYING') return;

    turnTimer = setTimeout(() => {
        forceRandomMove();
    }, 30000); // 30 seconds per turn
}

function forceRandomMove() {
    const currentPlayerId = playerIds[turnIndex];
    if(!players[currentPlayerId]) return;
    const hand = players[currentPlayerId].hand;
    let validCard = null;

    if (currentTrick.length > 0 && leadSuit) {
        validCard = hand.find(c => c.suit === leadSuit);
    }
    if (!validCard) validCard = hand[Math.floor(Math.random() * hand.length)];

    io.emit('gameStatus', `Player ${turnIndex + 1} timeout! Auto-playing.`);
    processMove(currentPlayerId, validCard);
}

// --- CORE GAME LOGIC ---
function processMove(playerId, card) {
    if (playerId !== playerIds[turnIndex]) return { success: false, msg: "Not your turn!" };
    
    const playerHand = players[playerId].hand;
    
    // Validation: Must Follow Suit
    if (currentTrick.length > 0) {
        const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);
        if (hasLeadSuit && card.suit !== leadSuit) return { success: false, msg: `Must play ${leadSuit}` };
    } else {
        leadSuit = card.suit;
    }

    // Execute Move
    players[playerId].hand = playerHand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    currentTrick.push({ playerId: playerId, card: card });
    io.emit('cardPlayed', { playerId: playerId, card: card });
    
    if (turnTimer) clearTimeout(turnTimer);

    if (currentTrick.length === 4) {
        finishTrick();
    } else {
        turnIndex = (turnIndex + 1) % 4;
        startTurnTimer();
    }
    return { success: true };
}

function finishTrick() {
    const winnerNode = determineTrickWinner(currentTrick, trumpSuit);
    const winnerId = winnerNode.playerId;
    const points = calculatePoints(currentTrick.map(c => c.card));
    
    const winningTeam = getTeam(winnerId);
    teamScores[winningTeam] += points;
    tricksPlayed++;

    setTimeout(() => {
        io.emit('trickComplete', { winner: winnerId });
        io.emit('updateScore', { teamA: teamScores['A'], teamB: teamScores['B'], target: currentBid, bidder: bidderTeam });

        if (tricksPlayed === 8) {
            calculateRoundResult();
        } else {
            currentTrick = [];
            leadSuit = null;
            turnIndex = playerIds.indexOf(winnerId);
            io.emit('gameStatus', `Player ${turnIndex+1} Leads.`);
            startTurnTimer();
        }
    }, 2000);
}

function calculateRoundResult() {
    let msg = "";
    if (teamScores[bidderTeam] >= currentBid) {
        msg = `Team ${bidderTeam} WON! Scored ${teamScores[bidderTeam]}`;
        gamePoints[bidderTeam]++;
    } else {
        msg = `Team ${bidderTeam} LOST! Scored ${teamScores[bidderTeam]}`;
        gamePoints[bidderTeam]--;
    }
    io.emit('gameOver', { msg: msg, gamePoints: gamePoints });
    // Reset basic round vars could go here
    gameState = "WAITING";
}

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
    console.log('User joined:', socket.id);
    players[socket.id] = { id: socket.id, hand: [] };
    io.emit('updatePlayerCount', Object.keys(players).length);

    // CHAT
    socket.on('sendMessage', (msg) => {
        const pIndex = playerIds.indexOf(socket.id);
        const name = pIndex >= 0 ? `Player ${pIndex+1}` : 'Spec';
        io.emit('receiveMessage', { user: name, text: msg.substring(0,50) });
    });

    // START GAME (When 4 connect)
    if (Object.keys(players).length === 4) {
        playerIds = Object.keys(players);
        gameState = 'BIDDING';
        turnIndex = 0;
        deck = createDeck();
        
        let i = 0;
        for (let id in players) {
            players[id].hand = deck.slice(i*8, (i*8)+4); // First 4 cards
            io.to(id).emit('dealCards', players[id].hand);
            i++;
        }
        io.emit('gameStatus', "Bidding Phase. Player 1 starts.");
        io.emit('askBid', { playerId: playerIds[0], currentHigh: 16 });
    }

    // BIDDING
    socket.on('submitBid', (bidAmount) => {
        if (socket.id !== playerIds[turnIndex]) return;
        
        if (bidAmount !== "pass") {
            if (bidAmount > currentBid) {
                currentBid = bidAmount;
                bidWinner = socket.id;
                bidderTeam = getTeam(bidWinner);
                io.emit('gameStatus', `High Bid: ${currentBid} by P${turnIndex+1}`);
            }
        }
        
        turnIndex = (turnIndex + 1) % 4;
        if (turnIndex === 0) { // Simple 1 round bidding
            gameState = 'TRUMP_SELECT';
            io.to(bidWinner).emit('selectTrump', "You won bid! Pick Trump.");
            io.emit('gameStatus', "Bidding Over. Winner picking Trump.");
        } else {
            io.emit('askBid', { playerId: playerIds[turnIndex], currentHigh: currentBid });
        }
    });

    // TRUMP SELECT
    socket.on('chooseTrump', (suit) => {
        if (socket.id !== bidWinner) return;
        trumpSuit = suit;
        trumpRevealed = false;
        gameState = 'PLAYING';
        
        io.emit('trumpSet', { msg: "Trump Hidden." });

        // Deal remaining 4 cards
        let i = 0;
        for (let id in players) {
            let secondHalf = deck.slice((i*8)+4, (i*8)+8);
            players[id].hand.push(...secondHalf);
            io.to(id).emit('dealSecondHand', secondHalf);
            i++;
        }
        
        // Reset turn to bidder or logic specific (Standard 29: Bidder leads)
        turnIndex = playerIds.indexOf(bidWinner);
        io.emit('gameStatus', "Game On! Bidder leads.");
        startTurnTimer();
    });

    // PLAY CARD
    socket.on('playCard', (card) => {
        const res = processMove(socket.id, card);
        if (!res.success) socket.emit('errorMsg', res.msg);
    });

    // TRUMP REVEAL
    socket.on('requestTrumpReveal', () => {
        if (!trumpRevealed) {
            trumpRevealed = true;
            io.emit('trumpRevealed', { suit: trumpSuit, revealer: socket.id });
        }
    });

    // MARRIAGE CLAIM
    socket.on('claimPair', () => {
        if (!trumpRevealed) return socket.emit('errorMsg', "Reveal Trump first!");
        const hand = players[socket.id].hand;
        if (hand.some(c=>c.suit===trumpSuit && c.rank==='K') && hand.some(c=>c.suit===trumpSuit && c.rank==='Q')) {
            teamScores[getTeam(socket.id)] += 4;
            io.emit('gameStatus', "MARRIAGE CLAIMED! (+4)");
            io.emit('updateScore', { teamA: teamScores['A'], teamB: teamScores['B'], target: currentBid, bidder: bidderTeam });
        } else {
            socket.emit('errorMsg', "Invalid Claim.");
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        // In real app, handle game pause/end here
        io.emit('updatePlayerCount', Object.keys(players).length);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));