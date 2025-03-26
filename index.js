const express = require("express");
const mysql = require('mysql2');
const app = express();
const port = 8080;
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const methodOverride= require("method-override");
const session = require('express-session');

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));

app.use(express.static(path.join(__dirname,"public")));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'dineflow',
    password: 'kabuli@54321'
});

app.get("/",(req,res) => {
    res.render("index.ejs");
});

app.get("/home", (req, res) => {
    res.render("home.ejs");  
});


app.get('/kitchen', (req, res) => {
    const dishQuery = 'SELECT id, dishname FROM dishdata'; 
    const orderQuery = 'SELECT * FROM orders';

    connection.query(dishQuery, (err, dishres) => {
        if (err) {
            return res.status(500).send("Error in dish data.");
        }

        let dishMap = {};
        dishres.forEach(dish => {
            dishMap[dish.id] = dish.dishname; 
        });

        // console.log("Dish Map:", dishMap);

        connection.query(orderQuery, (err, orderres) => {
            if (err) {
                return res.status(500).send("Failed to get order data");
            }

            let orders = orderres.map(order => {
                let dishCount = {};
                let orderItem = order.dish_ids ? order.dish_ids.split(" ") : []; 
                
                // console.log("Order Items for Order ID", order.order_id, ":", orderItem); 

                orderItem.forEach(id => {
                    dishCount[id] = (dishCount[id] || 0) + 1;
                });

                let dishes = Object.keys(dishCount).map(id => ({
                    name: dishMap[id] || `Unknown Dish (${id})`, 
                    quantity: dishCount[id]
                }));

                return {
                    order_id: order.order_id,
                    dishes: dishes
                };
            });

            res.render("kitchen.ejs", { orders });
        });
    });
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

app.post("/add-to-cart", (req, res) => {
    const { dishId } = req.body;
    let userId = req.session.userId;

    if (!dishId || !userId) {
        return res.status(400).send("Dish ID or User ID is missing!");
    }

    const getTableQuery = `SELECT tablenum FROM userdata WHERE id = ?`;
    connection.query(getTableQuery, [userId], (err, userResult) => {
        if (err || userResult.length === 0) {
            return res.status(500).send("Error fetching table number.");
        }
        
        let tableNum = userResult[0].tablenum;

        const getDishAmountQuery = `SELECT dishamount FROM dishdata WHERE id = ?`;
        connection.query(getDishAmountQuery, [dishId], (err, dishResult) => {
            if (err || dishResult.length === 0) {
                return res.status(500).send("Error fetching dish price.");
            }

            let dishPrice = dishResult[0].dishamount;

            const checkOrderQuery = `SELECT dish_ids, total_amount FROM orders WHERE user_id = ?`;
            connection.query(checkOrderQuery, [userId], (err, orderResult) => {
                if (err) {
                    return res.status(500).send("Error checking order data.");
                }

                if (orderResult.length > 0) {
                    let existingDishIds = orderResult[0].dish_ids || "";
                    let updatedDishIds = existingDishIds ? existingDishIds + " " + dishId : dishId;
                    let updatedTotalAmount = orderResult[0].total_amount + dishPrice;

                    const updateOrderQuery = `UPDATE orders SET dish_ids = ?, total_amount = ? WHERE user_id = ?`;
                    connection.query(updateOrderQuery, [updatedDishIds, updatedTotalAmount, userId], (err) => {
                        if (err) {
                            return res.status(500).send("Error updating order.");
                        }
                        res.redirect("/menu");
                    });

                } else {
                    const insertOrderQuery = `INSERT INTO orders (user_id, tablenum, dish_ids, total_amount) VALUES (?, ?, ?, ?)`;
                    connection.query(insertOrderQuery, [userId, tableNum, dishId, dishPrice], (err) => {
                        if (err) {
                            return res.status(500).send("Error inserting new order.");
                        }
                        res.redirect("/menu");
                    });
                }
            });
        });
    });
});

app.get("/login",(req,res) => {
    res.render("login.ejs");
});
app.get("/offers",(req,res) => {
    res.render("offers.ejs");
});

app.get("/payment",(req,res) => {
    const dishQuery = "SELECT id, dishname FROM dishdata";
    const orderQuery = "SELECT * FROM orders";

    connection.query(dishQuery, (err, dishres) => {
        if (err) return res.status(500).send("Error in dish data.");

        let dishMap = {};
        dishres.forEach(dish => {
            dishMap[dish.id] = dish.dishname;
        });

        connection.query(orderQuery, (err, orderres) => {
            if (err) return res.status(500).send("Failed to get orders data");

            let orders = orderres.map(order => {
                let dishCount = {};
                let orderItem = order.dish_ids ? order.dish_ids.split(" ") : [];

                orderItem.forEach(id => {
                    dishCount[id] = (dishCount[id] || 0) + 1;
                });

                let dishes = Object.keys(dishCount).map(id => ({
                    name: dishMap[id] || `Unknown Dish (${id})`,
                    quantity: dishCount[id]
                }));

                return {
                    order_id: order.order_id,
                    tablenum: order.tablenum,
                    order_status: order.order_status,  
                    dishes: dishes
                };
            });
            res.render("payment.ejs",{orders});
        });
    });
});

app.post("/move", (req, res) => {
    let { email, passwd } = req.body;
    if (email == "kitchen@gmail.com" && passwd == "kitchen123") {
        const dishQuery = "SELECT id, dishname FROM dishdata";
        const orderQuery = "SELECT * FROM orders";

        connection.query(dishQuery, (err, dishres) => {
            if (err) return res.status(500).send("Error in dish data.");

            let dishMap = {};
            dishres.forEach(dish => {
                dishMap[dish.id] = dish.dishname;
            });

            connection.query(orderQuery, (err, orderres) => {
                if (err) return res.status(500).send("Failed to get orders data");

                let orders = orderres.map(order => {
                    let dishCount = {};
                    let orderItem = order.dish_ids ? order.dish_ids.split(" ") : [];

                    orderItem.forEach(id => {
                        dishCount[id] = (dishCount[id] || 0) + 1;
                    });

                    let dishes = Object.keys(dishCount).map(id => ({
                        name: dishMap[id] || `Unknown Dish (${id})`,
                        quantity: dishCount[id]
                    }));

                    return {
                        order_id: order.order_id,
                        tablenum: order.tablenum,
                        order_status: order.order_status,  
                        dishes: dishes
                    };
                });

                res.render("kitchen.ejs", { orders });
            });
        });
    } else if (email == "payment@gmail.com" && passwd == "payment123") {
        const dishQuery = "SELECT id, dishname FROM dishdata";
        const orderQuery = "SELECT * FROM orders";

        connection.query(dishQuery, (err, dishres) => {
            if (err) return res.status(500).send("Error in dish data.");

            let dishMap = {};
            dishres.forEach(dish => {
                dishMap[dish.id] = dish.dishname;
            });

            connection.query(orderQuery, (err, orderres) => {
                if (err) return res.status(500).send("Failed to get orders data");

                let orders = orderres.map(order => {
                    let dishCount = {};
                    let orderItem = order.dish_ids ? order.dish_ids.split(" ") : [];

                    orderItem.forEach(id => {
                        dishCount[id] = (dishCount[id] || 0) + 1;
                    });

                    let dishes = Object.keys(dishCount).map(id => ({
                        name: dishMap[id] || `Unknown Dish (${id})`,
                        quantity: dishCount[id]
                    }));

                    return {
                        order_id: order.order_id,
                        tablenum: order.tablenum,
                        order_status: order.order_status,  
                        dishes: dishes
                    };
                });
                res.render("payment.ejs",{orders});
            });
        });
        
    } else {
        res.status(401).send("Invalid Email ID or Password");
    }
});

app.patch("/reset-table",(req,res) => {
    const { order_id,tablenumber } = req.body;
    console.log(tablenumber);

    const orderquery = `UPDATE orders SET order_status = '0' WHERE order_id = ?`;
    const tablequery = `UPDATE tablestatus SET availability = '0' WHERE tablenumber = ?`

    connection.query(orderquery, [order_id], (err, result) => {
        if (err) {
            return res.status(500).send("Error updating order status.");
        }

    });
    connection.query(tablequery, [tablenumber], (err, result) => {
        if (err) {
            return res.status(500).send("Error updating order status.");
        }
    
    });
    res.redirect("/payment");
});


app.get("/cart",(req,res) => {
    const dishQuery = 'SELECT * FROM dishdata';
    let orderQuery=`SELECT dish_ids FROM orders WHERE  user_id=${req.session.userId}`; 
    
    connection.query(dishQuery, (err, dishres) => {
        if (err) {
            return res.status(500).send("Error in dish data.");
        }
        
        connection.query(orderQuery, (err, orderres) => {
            if(err) {
                return res.status(500).send("Failed to get order data");
            }

            let dishMap={};

            if(orderres.length > 0){
                let orderItem = orderres[0].dish_ids.split(" ");
                
                orderItem.forEach((id) => {
                    dishMap[id] = (dishMap[id] || 0)+1;
                });
            }

            res.render("cart.ejs",{dish:dishres,dishMap});
        });
    });
});

app.get("/about",(req,res)=> {
    res.render("about.ejs");
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
                    req.session.userId = insertResult.insertId;
                    
                    res.render("home.ejs", {userId});
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

app.patch("/place-order",(req,res) => {
    let userId=req.session.userId;

    const query = `UPDATE orders SET order_status = '1' WHERE user_id = ?`;

    connection.query(query, [userId], (err, result) => {
        if (err) {
            return res.status(500).send("Error updating order status.");
        }
        res.render("home.ejs",{userId});
    });
});
app.listen(port, () =>{
    console.log(`App is Listening to ${port}`);
});