//Game logic here
const EMPTY = 0;
const X = 1;
const O = 2;

//Define global variables
//socket = new WebSocket("ws://localhost:3000");
socket = new WebSocket("ws://192.168.0.30:3000");
var cells = [];
var radius;
var playerID; //0 == X, 1 == O
var ctx;


document.addEventListener("DOMContentLoaded", function(event){ //Waits for the HTML content to be loaded
	var gameCanvas = document.getElementById("gameCanvas");
	//Initialize global variables
	radius = gameCanvas.width/8; 
	cells = [
		{x: gameCanvas.width * 1/6, y: gameCanvas.height * 1/6},
		{x: gameCanvas.width * 1/2, y: gameCanvas.height * 1/6},
		{x: gameCanvas.width * 5/6, y: gameCanvas.height * 1/6},
		{x: gameCanvas.width * 1/6, y: gameCanvas.height * 1/2},
		{x: gameCanvas.width * 1/2, y: gameCanvas.height * 1/2},
		{x: gameCanvas.width * 5/6, y: gameCanvas.height * 1/2},
		{x: gameCanvas.width * 1/6, y: gameCanvas.height * 5/6},
		{x: gameCanvas.width * 1/2, y: gameCanvas.height * 5/6},
		{x: gameCanvas.width * 5/6, y: gameCanvas.height * 5/6} ]

	//Set up grid
	resetCanvas(gameCanvas);




	gameCanvas.onclick=function(getMousePos){
		getClickedCell(gameCanvas, getMousePos);
	}
	
	//Listens for chat input and sends to server, then clears text input box
	document.getElementById("chatSubmit").onsubmit = function submitCallback(event){
		event.preventDefault();
		var textBox = document.getElementById("chatInput");
		socket.send("chat " + textBox.value);
		textBox.value = "";
	 }


	//Send click info to server
	gameCanvas.onclick=function(event){
		console.log(getMousePos(gameCanvas, event));
		var cellIndex = getClickedCell(gameCanvas, getMousePos(gameCanvas, event));
		socket.send("place " + cellIndex);
	};
});


//Draws a circle in cell
//(2d context, cell array)
function drawO(ctx,cell){
	console.log("Cell passed: " + cell);
	ctx.beginPath();
	//Define the circle
	ctx.arc(cells[cell].x,cells[cell].y,radius,0,Math.PI*2);
	//Draw the circle
	ctx.stroke();
}

//Draw an X in cell
//(2d context, cell array)
function drawX(ctx, cell){
	//left top to bottom right
	ctx.moveTo(cells[cell].x - radius, cells[cell].y - radius);
	ctx.lineTo(cells[cell].x + radius, cells[cell].y + radius);
	//right top to bottom left
	ctx.moveTo(cells[cell].x + radius, cells[cell].y - radius);
	ctx.lineTo(cells[cell].x - radius, cells[cell].y + radius);
	//Draw the X
	ctx.stroke();
}


function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
	  x: evt.clientX - rect.left,
	  y: evt.clientY - rect.top
	};
}

function getClickedCell(canvas, coords){
	var rect = canvas.getBoundingClientRect();
	var clickedCell = Math.floor(3 * coords.x / rect.width) + Math.floor(3 * coords.y / rect.height)*3;
	console.log(clickedCell);
	return clickedCell;
}

//Update gameInfo text
function updateGameInfoText(text){
	document.getElementById("gameInfo").innerHTML = text;
}


//Region: From Server

//Update and draw board from state received from server
function updateBoard(ctx, board){
	resetCanvas(document.getElementById("gameCanvas"));
	parsedBoard = board.split("").map(function(cell)
	{
		return parseInt(cell);
	});
	for(var i in parsedBoard){
		if(parsedBoard[i] == X){
			drawX(ctx, i);
		}
		else if(parsedBoard[i] == O){
			drawO(ctx, i);
		}
	}
}

function resetCanvas(gameCanvas){
	//Set up grid
	ctx = gameCanvas.getContext("2d");
	ctx.clearRect(0,0, gameCanvas.width, gameCanvas.height);
	ctx.beginPath();
	//Left Vertical
	ctx.moveTo(gameCanvas.width/3, 0);
	ctx.lineTo(gameCanvas.width/3, gameCanvas.clientHeight);

	//Right Vertical
	ctx.moveTo(gameCanvas.width/3 * 2, 0);
	ctx.lineTo(gameCanvas.width/3 * 2, gameCanvas.height);

	//Top Horizontal
	ctx.moveTo(0, gameCanvas.height/3);
	ctx.lineTo(gameCanvas.width, gameCanvas.height/3);

	//Bottom Horizontal
	ctx.moveTo(0, gameCanvas.height/3 *2);
	ctx.lineTo(gameCanvas.width, gameCanvas.height/3 *2);
	//Draw grid lines
	ctx.lineWidth = 5;
	ctx.stroke();
}



//net stuff


let state = "disconnected";
let id_player;
let board;

const processes =
{
	disconnected:
	{
		connected: function(args)
		{
			id_player = parseInt(args[0]);
			updateBoard(ctx, args[1]); //args[0] will be the board
			updateGameInfoText("Connected as Player " + (id_player + 1) + ", waiting for another player to join...");
			console.log("Connected as Player " + (id_player + 1) + ", waiting for another player to join...");
			state = "waiting";
		}
	},
	waiting:
	{
		ready: function()
		{
			updateGameInfoText("Another player has joined, starting game...");
			console.log("Another player has joined, starting game...");
			if(id_player == 1){
				updateGameInfoText("Waiting for opponent's move...");
			}
			state = "idle";
		},
		chat: function(args)
		{
			appendChat("Player" + (parseInt(args[0]) + 1), args.slice(1).join(" "));
			console.log("Player" + (parseInt(args[0]) + 1) + ": " + args.slice(1).join(" "));
		}
	},
	idle:
	{
		state: function(args)
		{
			updateGameInfoText("It is your turn");
			console.log("It is your turn");
			
			
			updateBoard(ctx, args[0]); //args[0] will be the board
			state = "turn";
		},
		ended: function(args)
		{
			const id_winningplayer = parseInt(args[0]);
		},
		chat: function(args)
		{
			appendChat("Player" + (parseInt(args[0]) + 1), args.slice(1).join(" "));
			console.log("Player" + (parseInt(args[0]) + 1) + ": " + args.slice(1).join(" "));
		}
	},
	turn:
	{
		invalid: function()
		{
			console.log("Invalid move; try again");
			updateGameInfoText("Invalid move; try again");
		},
		valid: function(args)
		{
			updateGameInfoText("Waiting for opponent's move...");
			console.log("Waiting for opponent's move...");
			updateBoard(ctx, args[0]); //args[0] will be the board
			state = "idle";
		},
		chat: function(args)
		{
			appendChat("Player" + (parseInt(args[0]) + 1), args.slice(1).join(" "));
			console.log("Player" + (parseInt(args[0]) + 1) + ": " + args.slice(1).join(" "));
		}
	},
	ended:
	{
		
	}
};

socket.onmessage = function(event)
{
	const args = event.data.split(" ");
	const process = processes[state][args[0]];
	
	if (process !== undefined)
		process(args.slice(1));
};


function appendChat(name, text){
	var iDiv = document.createElement("div");
	iDiv.className = "chatLine";
	var span = document.createElement("span");
	span.className = "playerName";
	span.innerHTML = name + ":";
	iDiv.appendChild(span);
	iDiv.innerHTML += text;
	document.getElementById("chatLines").appendChild(iDiv);
	document.getElementById("chatHistory").scrollTop = document.getElementById("chatHistory").scrollHeight;
}











