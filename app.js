var createError = require('http-errors');
var express = require('express');
var path = require('path');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const Users = require('./models/Users')
const Videos = require('./models/Videos')
const Danmu = require('./models/Danmu')
const Card = require('./models/Card')
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv")
const ffmpegHelper = require('./ffmpeg-helper')
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
const ffmpeg = require('ffmpeg');

var app = express();
app.use(cors({credentials: true, origin: 'http://localhost:5173'}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
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

app.use('/streams',express.static(path.join(__dirname, 'hls_output')))
app.use('/subtitles',express.static(path.join(__dirname, 'public/subtitles')))

// 接收檔案的路由
app.post('/upload', upload.single('file'), async(req, res) => {
  if (!req.file) {
    return res.status(400).send('未選擇檔案');
  }
  const fileInfo = req.file
  const videoPath = path.join(__dirname, `public/uploads/${fileInfo.filename}`);
  const subtitleDir = path.join(__dirname, 'public/subtitles');
  let split = fileInfo.filename.split('.')
  split.pop()
  let outputName = split.join('.')
  
  // HLS 輸出目錄
  const hlsPromise = new Promise((resolve, reject) => {
    try {
      ffmpegHelper.convertToHls(`./public/uploads/${fileInfo.filename}`,outputName)
      resolve(`HLS 轉檔完成：${outputName}`);
    } catch (err) {
      reject(`HLS 轉檔失敗: ${err}`);
    }
  });
  // 字幕輸出
  const subtitlePromise = new Promise((resolve, reject) => {
    const python = spawn('python', [
      path.join(__dirname, 'scripts/transcribe.py'),
      videoPath
    ]);

    python.stdout.on('data', (data) => {
      console.log(`🎧 Python: ${data}`);
    });

    python.stderr.on('data', (data) => {
      console.error(`❌ Python 錯誤: ${data}`);
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve(`字幕產生完成：${outputName}.srt`);
      } else {
        reject(`字幕產生失敗，代碼：${code}`);
      }
    });
  });
    // 同步執行
  Promise.all([hlsPromise, subtitlePromise])
    .then((results) => {
      console.log(results);
      res.send({
        success: true,
        message: '影片與字幕處理完成 ✅',
        details: results,
        video: `/uploads/${fileInfo.filename}`,
        subtitle: `/subtitles/${outputName}.srt`
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send({
        success: false,
        message: '影片處理失敗 ❌',
        error: err
      });
    });
  // ffmpegHelper.convertToHls(`./public/uploads/${fileInfo.filename}`,outputName)
  // res.send(`檔案已成功上傳到：'uploads,`);
  // 呼叫 Python 產生字幕
  // console.log('📝 開始產生字幕...');
  // const py = spawn('python', [
  //   path.join(__dirname, 'scripts/transcribe.py'),
  //   videoPath,
  //   subtitleDir
  // ]);
  // let pyOutput = '';
  // py.stdout.on('data', (data) => {
  //   pyOutput += data.toString();
  // });
  // py.on('close', (code) => {
  //   console.log(`Python process exited with code ${code}`);
  //   console.log('字幕檔產生路徑：', pyOutput.trim());

  //   res.send({
  //     message: '影片已上傳並產生字幕',
  //     video: `/uploads/${fileInfo.filename}`,
  //     subtitle: `/subtitles/${outputName}.srt`
  //   });
  // });
});

// 回傳影片檔名
app.get('/video',async(req,res)=>{
  let filenames = fs.readdirSync(path.join(__dirname,'public/uploads'));
  // let filterFiles = filenames.filter((item)=>{
  //   if(item.split('.').pop()=='mp4') return item
  // })
  try{
    const result = await Videos.find({})
    console.log(result)
    let filterFiles = result.map(item=>Object.values(item)[2])
    console.log(filenames)
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
   res.cookie('user', token,{
      httpOnly:true,
      secure:false,
   })
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
  const token = req.cookies.user
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
  const token = req.cookies.user
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

//撈出歷史彈幕
app.post('/findDanmus',async(req,res)=>{
  console.log(req.body)
  try{
    const result = await Danmu.findOne({
      videoId:req.body.videoId
    })
    console.log(result)
    res.send(result)
  }catch(err){
    console.log(err)
  }
})

// 撈出歷史卡片
app.post('/findCards',async(req,res)=>{
  console.log(req.body)
  try{
    const result = await Card.findOne({
      videoId:req.body.videoId
    })
    console.log(result)
    res.send(result)
  }catch(err){
    console.log(err)
  }
})

// 儲存卡片資料
app.post('/addCard',async(req,res)=>{
  console.log(req.body)
  try{
    const result = await Card.findOneAndUpdate(
      { videoId:req.body.videoId }, // 找到該影片
      { $push: { cards: req.body.cardData } }, // 把新卡片推進去
      { new: true, upsert: true } // 回傳更新後的 document；如果沒影片就建立新的
    );
    res.send(result)
  }catch(err){
    console.log(err)
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
