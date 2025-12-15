const socket = io();

// UI Updates
socket.on('updatePlayerCount', (c) => document.getElementById('player-count').innerText = c);
socket.on('gameStatus', (msg) => document.getElementById('status').innerText = msg);
socket.on('errorMsg', (msg) => alert(msg));

// Chat
socket.on('receiveMessage', (data) => {
    const box = document.getElementById('chat-box');
    box.innerHTML += `<div><b>${data.user}:</b> ${data.text}</div>`;
    box.scrollTop = box.scrollHeight;
});
function sendChat() {
    const inp = document.getElementById('chat-input');
    if(inp.value.trim()) socket.emit('sendMessage', inp.value);
    inp.value = '';
}

// Cards Logic
function createCard(card) {
    const el = document.createElement('div');
    el.id = `${card.rank}-${card.suit}`;
    el.className = `card ${['hearts','diamonds'].includes(card.suit)?'red':''}`;
    el.innerText = `${card.rank}\n${getSymbol(card.suit)}`;
    el.onclick = () => socket.emit('playCard', card);
    return el;
}
function getSymbol(s) { return {'hearts':'♥','diamonds':'♦','clubs':'♣','spades':'♠'}[s]; }

socket.on('dealCards', (hand) => {
    document.getElementById('my-hand').innerHTML = '';
    hand.forEach(c => document.getElementById('my-hand').appendChild(createCard(c)));
});
socket.on('dealSecondHand', (cards) => {
    cards.forEach(c => document.getElementById('my-hand').appendChild(createCard(c)));
});

// Bidding
socket.on('askBid', (data) => {
    if(socket.id === data.playerId) {
        let bid = prompt(`Current Bid: ${data.currentHigh}. Enter higher bid (16-28) or 'pass':`);
        socket.emit('submitBid', bid === 'pass' ? 'pass' : parseInt(bid));
    }
});
socket.on('selectTrump', () => {
    let suit = prompt("You won! Type suit (hearts, diamonds, clubs, spades):").toLowerCase();
    socket.emit('chooseTrump', suit);
});

// Play Area
socket.on('cardPlayed', (data) => {
    const tbl = document.getElementById('table');
    const el = document.createElement('div');
    el.className = `card ${['hearts','diamonds'].includes(data.card.suit)?'red':''}`;
    el.innerText = `${data.card.rank}\n${getSymbol(data.card.suit)}`;
    tbl.appendChild(el);
    if(data.playerId === socket.id) {
        const myC = document.getElementById(`${data.card.rank}-${data.card.suit}`);
        if(myC) myC.remove();
    }
});
socket.on('trickComplete', () => document.getElementById('table').innerHTML = '');

// Score & Trump Reveal
socket.on('updateScore', (d) => {
    document.getElementById('score-a').innerText = d.teamA;
    document.getElementById('score-b').innerText = d.teamB;
    document.getElementById('bid-target').innerText = d.target;
    document.getElementById('bid-team').innerText = d.bidder;
});
socket.on('trumpSet', () => {
    const t = document.createElement('div');
    t.id = 'trump-card-display'; t.className = 'card back'; t.innerText = '?';
    t.onclick = () => confirm("Reveal Trump?") && socket.emit('requestTrumpReveal');
    document.getElementById('table').appendChild(t);
});
socket.on('trumpRevealed', (d) => {
    const t = document.getElementById('trump-card-display');
    if(t) { t.className = `card ${['hearts','diamonds'].includes(d.suit)?'red':''}`; t.innerText = getSymbol(d.suit); }
});

function claimPair() { socket.emit('claimPair'); }