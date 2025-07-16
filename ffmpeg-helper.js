const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
var path = require('path')

module.exports = {
    convertToHls : async(file,fileName)=>{
        fs.mkdirSync(path.join(__dirname,`hls_output/${fileName}`))
        return new Promise((resolve)=>{
            ffmpeg(file)
            .outputFormat('hls')
            .outputOption('-hls_list_size 0')
            .outputOption('-hls_time 5')
            .output(`./hls_output/${fileName}/${fileName}.m3u8`)
            .on('end',()=>{
                console.log('finish')
                resolve()
            })
            .on('error',(err)=>{
                console.log('error',err.message)
            })
            .run()
        })
    }
}
