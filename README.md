
# Talk-A-Tive

Talk-a-tive is a Full Stack Chatting App.
Uses Socket.io for real time communication and stores user details in encrypted format in Mongo DB Database.
## Tech Stack

**Client:** React JS

**Server:** Node JS, Express JS

**Database:** Mongo DB
  
## Demo

[https://talk-a-tive.herokuapp.com/](https://talk-a-tive-7fgq.onrender.com)

![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/group%20%2B%20notif.PNG)
## Run Locally

Clone the project

```bash
  git clone https://github.com/piyush-eon/mern-chat-app
```

Go to the project directory

```bash
  cd mern-chat-app
```

Install dependencies

```bash
  npm install
```

```bash
  cd frontend/
  npm install
```

Start the server

```bash
  npm run start
```
Start the Client

```bash
  //open now terminal
  cd frontend
  npm start
```

  
# Features

### Authenticaton
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/login.PNG)
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/signup.PNG)
### Real Time Chatting with Typing indicators
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/real-time.PNG)
### One to One chat
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/mainscreen.PNG)
### Search Users
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/search.PNG)
### Create Group Chats
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/new%20grp.PNG)
### Notifications 
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/group%20%2B%20notif.PNG)
### Add or Remove users from group
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/add%20rem.PNG)
### View Other user Profile
![](https://github.com/piyush-eon/mern-chat-app/blob/master/screenshots/profile.PNG)
## Made By

- [@Piyush-eon](https://github.com/piyush-eon)

  

## Backend user model fix (data integrity)

A critical fix was applied to `backend/models/userModel.js`:
- corrected schema field type declarations to use `String` (constructor) instead of the string literal type;
- corrected `timestamps` option (previous typo prevented `createdAt`/`updatedAt` generation);
- fixed password hashing middleware to hash only when `password` is modified;
- enforced email normalization (`lowercase` + `trim`) and retained uniqueness.

### Migration considerations
- Existing user records keep their current email casing until updated. New writes normalize email to lowercase.
- If you have legacy duplicate emails that differ only by case/whitespace, clean them before relying on the unique email index in production.
