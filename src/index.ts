import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from "cors"
import data from '../data/default.json'
import { cache } from './cache';
import { Questions } from "../data/question.json"
const PORT = process.env.PORT || 5000; 
const { rooms } = data;

const app = express();
app.use(cors())
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'https://localhost:8001',
        methods: ['GET', 'POST'],
    },
});

rooms.forEach((item, index) => {
    cache.set("rooms", item.id, { ...item });
});

app.get("/hello",(req,res)=>{
    res.send("hello")
})

io.on("connection", (socket) => {

    socket.on("available_rooms", () => {
        socket.emit("rooms", cache.getAll("rooms"))
    })
    socket.on("create_room", () => {

        const size = cache.getAll("rooms").length || 0;
        cache.set("rooms", size + 1, {
            id: size + 1,
            players: [],
            questions: [],
            currentQuestion: null,
            currentAnswer: null,
            score: {},
            questionTimeout: null
        })
        const rooms = cache.getAll("rooms")

        io.emit("rooms", rooms)
    })
    socket.on("join_room", (option) => {
        const { roomId, username } = option
        console.log("join room called",socket.id)
        socket.join("room" + roomId)
        const room = cache.get("rooms", roomId);
        room.players.push({ id: socket.id, username ,score:0})
        console.log("room players")
        if (room.players.length === 1) {
            console.log("emit")

            socket.emit("waiting_room", { roomId, username })
        }
        cache.set("rooms", roomId, room);
        if (room.players.length === 2) {
            const question = getRandomQuestions(Questions, 5)
            room.question = question
            room.isFull=true
            cache.set("rooms", roomId, room)
            io.in("room" + roomId).emit("game_start", { players: room.players })
            askNewQuestion(roomId)
        }


    })

    socket.on("submitAnswer", (roomId,option) => {
        
        const room = cache.get("rooms", roomId);
        const currentPlayer = room.players.find(player => player.id == socket.id);
       
        if (currentPlayer) {
            const correctAnswer = room.correctAnswer;
            const isCorrect = correctAnswer === option;
            console.log("answer",isCorrect)
            currentPlayer.score = isCorrect ?
                (currentPlayer.score || 0) + 10 : (currentPlayer.score || 0);
        }

        console.log("room",room)
        cache.set("rooms",roomId,room)

    })

    socket.on("ask_new_question", (roomId) => {
        askNewQuestion(roomId)
    })

    
    socket.on('answerResult', (data) => {
        console.log('Answer result received:', data);
        // Handle the data (e.g., update UI, scores, etc.)
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // Handle player removal from rooms, etc.
    });

    socket.emit("rooms", cache.getAll("rooms"))
})

function getRandomQuestions(questions: any[], num: number) {
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

const askNewQuestion = (roomId: number) => {
    console.log("called ask question")
    const room = cache.get("rooms", roomId);
    const questions = room.question;
    if (questions && questions.length === 0) {
        console.log("called gameOver")

        io.in("room" + roomId).emit("gameOver", { players: room.players })
        cache.delete("rooms", roomId)
        return
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    room.correctAnswer = question.answer
    io.in("room" + roomId).emit("newQuestion", {
        question: question.question,
        options: question.options,
        timer: 10,
        roomId
    })
    room.question.splice(randomIndex, 1);
    console.log("complte one question")
    if (room.questionTimeout) {
        clearTimeout(room.questionTimeout);
    }

    // Set a 10-second timer for the next question
    room.questionTimeout = setTimeout(() => {
        io.in("room" + roomId).emit("answerResult", {
            correctAnswer: room.correctAnswer,
            scores: room.players.map((player) => ({
                name: player.username,
                score: player.score || 0,
            }))
        });

        // Ask the next question after sending the results
        askNewQuestion(roomId);
    }, 10000);

    // Clone the room object without the questionTimeout
    const roomToCache = { ...room };
    delete roomToCache.questionTimeout;

    // Update the room in the cache
    cache.set("rooms", roomId, roomToCache);
   
}
server.listen(PORT, () => {
    console.log("Server listening on port 5000");
});
