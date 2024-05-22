const uuid = require('uuid');
const express = require('express');
const axios = require('axios');
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
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions, null, 2), 'utf-8');
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

app.use((req, res, next) => {
    const token = req.headers[SESSION_KEY];
    if (token) {
        req.session = sessions.get(token);
        req.sessionId = token;
    }

    next();
});

app.get('/', (req, res) => {
    console.log("GET", req.session, req.sessionId)
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
    console.log("LOGOUT", req.sessionId)
    sessions.destroy(req.sessionId);
    res.redirect('/');
});

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    console.log("LOGIN", login, password);

    const options = {
        method: 'POST',
        url: 'https://dev-7sfm4dwi0agzg42e.us.auth0.com/oauth/token',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        data: {
            grant_type: 'password',
            audience: 'https://dev-7sfm4dwi0agzg42e.us.auth0.com/api/v2/',
            client_id: '2rt9zMZergxHgi7SqMDSo2nBLXw2gHV3',
            client_secret: 'UhwrkkaOHZ8jLwirvoivMAG8n1AeEe6NfI1itImdyjEbAzsygoo0Pjizl_HuYRD6',
            username: login,
            password: password,
            scope: 'offline_access'
        }
    }

    try {
        const response = await axios(options);
        console.log(response.data);

        const sessionId = response.data.access_token;
        const currentSession = {"username": login, "refresh":response.data.refresh_token}
        sessions.set(sessionId, currentSession);
        res.json({ token: sessionId });

    } catch (error) {
        console.error('Error getting user token', error.response ? error.response.data : error.message);
        res.status(401).send();
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
