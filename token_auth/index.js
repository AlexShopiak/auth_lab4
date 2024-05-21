const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init() {
        const sessionId = uuid.v4();
        console.log("GENERATE", sessionId)
        return sessionId;
    }

    destroy(sessionId) {
        delete this.#sessions[sessionId];
        console.log("RESTROY", sessionId)
        this.#storeSessions();
    }
}

const sessions = new Session();

app.get('/', (req, res) => {
    const token = req.headers[SESSION_KEY];
    if (token) {
        req.session = sessions.get(token);
    }
    console.log("GET", req.session, token)
    if (req.session) {
        if (req.session.username){
            return res.json({
                username: req.session.username,
                logout: 'http://localhost:3000/logout'
            })
        }
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    const token = req.headers[SESSION_KEY];
    if (token) {
        req.sessionId = token;
    }
    console.log("LOGOUT", req.sessionId)
    sessions.destroy(req.sessionId);
    res.redirect('/');
});

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
]

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    console.log("LOGIN", login, password)

    const user = users.find((user) => {
        if (user.login == login && user.password == password) {
            return true;
        }
        return false
    });

    if (user) {
        const sessionId = sessions.init();
        const currentSession = {"username":user.username,"login":user.login}
        sessions.set(sessionId, currentSession);
        res.json({ token: sessionId });
    }

    res.status(401).send();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
