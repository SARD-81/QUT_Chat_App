
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


## Environment variables

Add these variables to your `.env` file for secure Cloudinary uploads:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Attachment uploads are now signed by the backend at `POST /api/upload/signature` and validated for MIME type + max size (10MB).

## Rate limiting

To reduce abuse on authentication/user lookup endpoints, the backend now rate-limits:
- `POST /api/user` (register)
- `POST /api/user/login`
- `GET /api/user?search=`

When the limit is exceeded, the API responds with HTTP `429` and a JSON error message.

Configure the limiter in your environment:
- `RATE_LIMIT_WINDOW_MS` - window duration in milliseconds (default: `900000`, i.e. 15 minutes)
- `RATE_LIMIT_MAX` - max requests per IP within the window for the protected routes (default: `20`)

## Security headers (Helmet)

The Express server now uses [Helmet](https://helmetjs.github.io/) for baseline HTTP security headers:

- `app.use(helmet())` is registered early in the middleware chain in `backend/server.js`;
- this is a production-safe default for React SPA hosting and API routes;
- Helmet's default CSP is enabled. If you later load scripts/styles/fonts/images from external domains, extend CSP directives explicitly rather than disabling CSP globally.

### CSP caveat for SPA integrations
If you add third-party assets (analytics, CDNs, fonts, widgets), update Helmet config with `helmet.contentSecurityPolicy` directives to allow only the exact sources your app needs.

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
