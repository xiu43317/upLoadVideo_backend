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
app.use(cors())
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
app.get('/video',(req,res)=>{
  let filenames = fs.readdirSync(path.join(__dirname,'public/uploads'));
  let filterFiles = filenames.filter((item)=>{
    if(item.split('.').pop()=='mp4') return item
  })
  res.send({success:true,filterFiles}).end()
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
   res.send({
    user:result,
    message:"登入成功"
   })
  }catch(err){
    console.log(err)
  }
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
