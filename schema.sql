CREATE DATABASE dineflow;

USE dineflow;

CREATE TABLE tablestatus (
    tablenumber INT PRIMARY KEY,  
    availability TINYINT DEFAULT 0  
);

CREATE TABLE userdata (
    id INT PRIMARY KEY AUTO_INCREMENT,  
    username VARCHAR(50) UNIQUE NOT NULL,  
    email VARCHAR(50) UNIQUE NOT NULL,  
    phonenumber VARCHAR(15) NOT NULL, 
    tablenum INT NOT NULL,  
    FOREIGN KEY (tablenum) REFERENCES tablestatus(tablenumber)  
);

CREATE TABLE dishdata (
    id INT PRIMARY KEY AUTO_INCREMENT,  
    dishname VARCHAR(50) UNIQUE NOT NULL,  
    dishimage MEDIUMBLOB,  
    dishamount INT NOT NULL  
);

CREATE TABLE orders (  
    order_id INT PRIMARY KEY AUTO_INCREMENT,  
    user_id INT NOT NULL,  
    tablenum INT NOT NULL,  
    dish_ids TEXT NOT NULL, 
    total_amount INT NOT NULL,  
    FOREIGN KEY (user_id) REFERENCES userdata(id),  
    FOREIGN KEY (tablenum) REFERENCES tablestatus(tablenumber)  
);

INSERT INTO tablestatus (tablenumber, availability)
VALUES
(1, 0),
(2, 0),
(3, 0),
(4, 0),
(5, 0);