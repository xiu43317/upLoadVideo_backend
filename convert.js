const ffmpegHelper = require('./ffmpeg-helper')
(async ()=>{
    await ffmpegHelper.convertToHls('./public/uploads/20240429_162956.mp4')
})()