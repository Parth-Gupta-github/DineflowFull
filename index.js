const express = require("express");
const mysql = require('mysql2');
const app = express();
const port = 8080;
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const methodOverride= require("method-override");

app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));

app.use(express.static(path.join(__dirname,"public")));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'dineflow',
    password: ''
});

app.get("/",(req,res) => {
    res.render("index.ejs");
});

app.get("/home", (req, res) => {
    res.render("home.ejs");  
});

app.get("/menu", (req,res) => {
    const q='SELECT * FROM dishdata';
    try{
        connection.query(q, (err, result) => {
            if(err) throw err;

            result.forEach(dish => {
                if (dish.dishimage) {
                    dish.dishimage = Buffer.from(dish.dishimage).toString('base64');
                }
            });
            
            let post = result;
            res.render("menu.ejs",{post})
        });
        }catch(err) {
            console.log(err);
            res.send("some error in DB")
        }
});

app.post("/home",(req,res) => {
    let{user, email, phonenumber, table} = req.body;

    if(table>0 && table<6 ){
        const query = 'SELECT availability FROM tablestatus WHERE tablenumber = ?';

        connection.query(query, [table], (err, result) => {
            if (err) {
                return res.status(500).send('Database query error');
            }
            if(result[0].availability === 0){

                const updateQuery = 'UPDATE tablestatus SET availability = 1 WHERE tablenumber = ?';
                connection.query(updateQuery, [table], (err, updateResult) => {
                if (err) {
                    return res.status(500).send("Error updating table status.");
                    }
                });

                const insertQuery = 'INSERT INTO userdata (username, email, phonenumber, tablenum) VALUES (?, ?, ?, ?)';
                connection.query(insertQuery, [user, email, phonenumber, table], (err, insertResult) => {
                    if (err) {
                        return res.status(500).send("Error inserting user data.");
                    }
                    
                    const userId = insertResult.insertId;
                    
                    res.render("home.ejs", {userId});
                    // res.send(`Table ${table} has been successfully booked for ${user} with user id ${userId}!`);
                });

                
            }
            else{
                return res.status(400).send("Selected table is already occupied");
            }
        });
    }
    else
    {
        return res.status(400).send("Wrong table number in input");
    }
});

app.listen(port, () =>{
    console.log(`App is Listening to ${port}`);
});