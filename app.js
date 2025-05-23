var createError = require('http-errors');
var express = require('express');
var path = require('path');
const multer = require('multer');
const fs = require('fs');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const Users = require('./models/Users')
const Videos = require('./models/Videos')
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv")
dotenv.config()
const { JWT_SECRET } = process.env


mongoose.connect('mongodb://localhost:27017/tutorials', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Users.findOne({ 
//   name: 'Rock',
//   email: 'abc@gmail.com',
//   password: '12345678'
// })
// .then((result)=>{
//   console.log("result:",result)
// }).catch((err)=>{
//   console.log(err)
// })

const db = mongoose.connection;
db.on('error', (err) => console.error('connection error', err)); // 連線異常
db.once('open', (db) => console.log('Connected to MongoDB')); // 連線成功

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({credentials: true, origin: true}))
app.use(express.json()); // Parses JSON request bodies


// 動態設定儲存目錄與檔案命名
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userPath = req.body.path || 'uploads'; // 預設為 uploads 資料夾
    const fullPath = path.join(__dirname, `public/${userPath}`);

    // 確保目錄存在
    fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});
const upload = multer({ storage });
// 提供靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// 接收檔案的路由
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('未選擇檔案');
  }
  res.send(`檔案已成功上傳到：'uploads'`);
});

// 回傳影片檔名
app.get('/video',async(req,res)=>{
  let filenames = fs.readdirSync(path.join(__dirname,'public/uploads'));
  let filterFiles = filenames.filter((item)=>{
    if(item.split('.').pop()=='mp4') return item
  })
  try{
    const result = await Videos.find({})
    console.log(result)
    res.send({
      success:true,
      filterFiles,
      videoInfo:result
    }).end()
  }catch(err){
    console.log(err)
  }
})

// 查找全部資料
app.get('/all',async(req,res)=>{
  try{
    const result = await Users.find({})
    console.log(result)
    res.send(result)
  }catch(err){
    console.log(err)
  }
})

// 新增影片資訊
app.post('/video',async(req,res)=>{
  await Videos.create({
    name:req.body.name,
    fileName:req.body.fileName
  })
  res.send("影片新增成功")
})

// 修改影片資訊
app.put('/video',async(req,res)=>{
  await Videos.findOneAndUpdate({
    _id:req.body.id
  },{
    name:req.body.name
  },{
    new:true
  })
  res.send("修改完成")
})

// 註冊資料
app.post('/register',async(req,res)=>{
  await Users.create({
    name:req.body.username,
    email:req.body.email,
    password:req.body.password,
    isManger:req.body.isManger
  })
  res.send("註冊成功")
})

// 驗證會員
app.post('/login',async(req,res)=>{
  console.log(req.body)
  try{
      const result = await Users.findOne({
      email: req.body.username,
      password: req.body.password
   })
   console.log(result)
   const data = {
    name:result.name,
    email:result.email,
    isManger:result.isManger
   }
   const token = jwt.sign(data, JWT_SECRET);
   console.log(token)
   res.cookie('user', token)
   res.send({
    user:result,
    message:"登入成功",
   })
  }catch(err){
    console.log(err)
  }
})

// 確認cookie

app.get('/check',async(req,res)=>{
  const token = req.header('Authorization')
  console.log(token)
  if (token) {
    console.log(token)
    await jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log(err)
        return res.sendStatus(403)
      }
        res.status(200).send({
        status:"success",
        data:user
      })
    });
  } else {
    res.sendStatus(401);
  }
})

// 登出
app.get('/logout',(req,res)=>{
  const token = req.header('Authorization');
  console.log(token)
  if(token){
    res.clearCookie('user')
    res.status(200).send({
      status:"success",
      message:"已登出"
    })
  }else{
    res.status(200).send({
      status:"success",
      message:"已登出"
    })
  }
})



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
