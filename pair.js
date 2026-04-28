const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const express = require('express')

const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json())

app.get('/', (req, res) => {
    res.send(`
    <h2>VOID-MD Pair Site</h2>
    <input id="num" placeholder="254712345678">
    <button onclick="pair()">PAIR CODE</button>
    <p id="result"></p>
    <script>
        async function pair() {
            const num = document.getElementById('num').value
            const res = await fetch('/pair?number=' + num)
            const data = await res.json()
            document.getElementById('result').innerText = data.code || data.error
        }
    </script>
    `)
})

app.get('/pair', async (req, res) => {
    const number = req.query.number
    if (!number) return res.json({ error: 'Add ?number=254712345678' })
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('session')
        const { version } = await fetchLatestBaileysVersion()
        
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['VOID-MD', 'Chrome', '1.0.0']
        })
        
        const code = await sock.requestPairingCode(number)
        
        sock.ev.on('connection.update', async (update) => {
            if (update.connection === 'open') {
                const creds = fs.readFileSync('./session/creds.json')
                const sessionID = Buffer.from(creds).toString('base64')
                console.log('SESSION_ID:', sessionID)
                process.exit(0)
            }
        })
        
        res.json({ code: `CODE: ${code}` })
        sock.ev.on('creds.update', saveCreds)
    } catch (e) {
        res.json({ error: 'Failed: ' + e.message })
    }
})

app.listen(PORT, () => console.log(`Pair site on port ${PORT}`))
