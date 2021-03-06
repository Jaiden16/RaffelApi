const db = require('../db');

const getRaffles = async (req, res, next) => {
    try {
        const raffle = await db.any("SELECT id,name, created_at,raffled_at, winner_id,raffled_at FROM raffles");
        res.json({
            raffles: raffle,
            message: 'success'
        }).status(200)

    } catch (err) {
        console.log(err);

    }
}

const postRaffle = async (req, res, next) => {
    let info = {};
    let query =
        "INSERT INTO raffles(name,secret_token,created_at) VALUES (${name},${secret},${time}) RETURNING *"
    let date = new Date();
    // console.log(date.toISOString())

    try {
        if (req.body.name) {
            info.name = req.body.name
        }

        if (req.body.secret) {
            info.secret = req.body.secret
        }

        if (req.body.name && req.body.secret) {
            info.time = date.toISOString()

            let payload = await db.one(query, info)
            console.log(payload);
            res.json({
                data: payload,
                message: "success"
            }).status(200)

        }

    } catch (err) {
        console.log(err)
    }
}

//get /raffles/:id - retrieve a single raffle by its id
const getSingleRaffle = async (req, res, next) => {
    try {
        let raffle = await db.any(`SELECT id,name, created_at,raffled_at, winner_id, secret_token FROM raffles WHERE raffles.id = ${req.params.id} `)

        if (raffle) {
            res.json({
                raffle: raffle,
                message: 'retrieved raffle'
            }).status(200)
        } else {
            res.json({
                message: 'no raffle'
            })
        }

    } catch (err) {
        console.log(err)

    }
}





//get /raffles/:id/participants retrieve all participants of a raffle
const getRaffleParticipants = async (req, res, next) => {
    try {
        // let query = `SELECT users.id, raffle_id, firstname,lastname, email, phone FROM raffles 
        // JOIN users ON (users.raffle_id = ${req.params.id})`
        let users = await db.any(`SELECT users.id, users.raffle_id, users.firstname, users.lastname, users.email, users.phone, users.registered_at FROM raffles
            JOIN users ON (users.raffle_id = raffles.id)
            WHERE raffles.id = ${req.params.id}`)
        if (users) {
            res.json({
                participants: users,
                message: 'success'
            })
        } else {
            res.json({
                message: 'no participants'
            })
        }


    } catch (err) {
        console.log(err)
    }

}

//post /raffles/:id/participants sign up a participant to a raffle given a raffle id.
const postParticipant = async (req, res, next) => {
    let info = {};
    let date = new Date();
    let query = 'INSERT into users(raffle_id,firstname,lastname,email,phone,registered_at)'
    let values = 'VALUES(${id},${first},${last},${email},${phone},${registered})';
    let fullQuery = query + values + 'RETURNING *';
    try {
        if (req.body.first && req.body.last && req.body.email) {
            info.id = req.params.id
            info.first = req.body.first,
                info.last = req.body.last,
                info.email = req.body.email
        }

        if (req.body.phone) {
            info.phone = req.body.phone
            info.registered = date.toISOString()
        } else {
            info.phone = "n/a"
            info.registered = date.toISOString()
        }

        let payload = await db.one(fullQuery, info)
        res.json({
            data: payload,
            message: 'success'
        }).status(200)
    } catch (err) {
        res.json({
            data: "Email already used"
        })
        console.log(err)
    }
}

const pickWinner = async (req, res, next) => {
    let secret = req.body.token




    try {
        //check to see if there is raffle in first place
        let raffle = await db.oneOrNone(`SELECT * FROM raffles where id = ${req.params.id} `)
        if (!raffle) {
            let err = "no raffle"
            throw (err)
        }
        //check to see if current raffle has a winner
        // let query1 = `SELECT winner_id from raffles Where id = ${req.params.id}`
        let checkWinner = await db.oneOrNone(`SELECT winner_id from raffles Where id = ${req.params.id}`)

        console.log('check winner result', checkWinner.winner_id)

        if (checkWinner.winner_id === null) {
            
            console.log(checkWinner.winner_id)
            
            //check to see if token is right
            let secretQuery = await db.oneOrNone(`SELECT secret_token from raffles WHERE id = ${req.params.id} `)
            let code = secretQuery.secret_token
            
            console.log("code token",code)
            
            if (secret !== code) {
                let error = { message: "invalid token" }
                throw (error)
            }

            // get all participants from  single raffle
            let query2 = `SELECT users.id, users.raffle_id, users.firstname, users.lastname, users.email, users.phone, users.registered_at FROM raffles
            JOIN users ON (users.raffle_id = raffles.id)
            WHERE raffles.id = ${req.params.id}`
            
            let users = await db.any(query2)
            console.log(users)
            let winnerIndex = Math.floor((Math.random() * users.length))
            let winner = users[winnerIndex];
            
            console.log("winner", users[winnerIndex])

            //insert into raffle time raffle was raffled and winner it
            let date = new Date()
            update = {
                time: date.toISOString(),
                winner_id: winner.id
            }
            let query3 = 'UPDATE raffles SET raffled_at = $/time/, winner_id = $/winner_id/'
            let endQuery = `WHERE raffles.id = ${req.params.id} RETURNING *`
            let fullQuery = query3 + endQuery
            console.log(query3)
            let patch = await db.one(fullQuery, update)
            console.log(patch)

            // return the winner
            let raffleWinner = await db.any(`SELECT users.id,firstname,lastname,email,phone,registered_at FROM raffles JOIN users ON (users.id= raffles.winner_id)
            WHERE raffles.winner_id = ${winner.id}`)
            console.log("returned winner", raffleWinner)
            res.json({
                data: raffleWinner,
                message: "winner picked"
            }).status(200)

        } else {
            let raffleWinner = await db.any(`SELECT users.id, firstname,lastname,email,phone,registered_at FROM raffles JOIN users ON (users.id = raffles.winner_id)
            WHERE raffles.id = ${req.params.id}`)
            console.log(raffleWinner)
            res.json({
                data: raffleWinner,
                message: "Recent Winner"
            }).status(200)
        }





    } catch (err) {
        res.json({
            response: err,
            message: "no raffle here"
        }).status(404)
        console.log(err)
    }

}



module.exports = { getRaffles, postRaffle, getSingleRaffle, getRaffleParticipants, postParticipant, pickWinner };