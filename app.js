var createError = require('http-errors');
var express = require('express');
var path = require('path');
const multer = require('multer');
const fs = require('fs');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors')


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
app.use(cors())


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
