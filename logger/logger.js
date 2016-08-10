var http = require('http'),                                               
    Stream 		= require('stream').Transform, 
    request 	= require('request'),                                 
    fs 			= require('fs');    
var MjpegCamera = require('mjpeg-camera');
var FileOnWrite = require('file-on-write');
var pool 		= require('../../api-pdam/core/con').conGis();
var MjpegProxy 	= require('mjpeg-proxy').MjpegProxy;
var ping 		= require('ping');




function jadwal(callback){
	pool.getConnection(function(err,con){
		if (err) {
			console.log({'teks':'Gagal koneksi ke database GIS','err':err});
		}else{
			pool.query("select i.loggerid, i.iplogger, i.ipcam, j.jamawal from ip i join jadwal j on i.loggerid=j.loggerid ",function(err,row,field){
				if (err) {
					saveLog(err);
				}else{
					callback(row);
				}
			})
		}
		con.release();
	})
}

function tanggal(callback){
	var date 	= new Date();
	var th 		= date.getFullYear();
	var bl 		= date.getMonth()+1;
	String(bl).length == 1 ? bl = '0'+String(bl) : bl = bl;
	var tg 		= date.getDate();
	String(tg).length == 1 ? tg = '0'+String(tg) : tg = tg;
	var jam 	= String(date.getHours()).length == 2 ? date.getHours() : '0'+String(date.getHours());
	var menit 	= String(date.getMinutes()).length == 2 ? date.getMinutes() : '0'+String(date.getMinutes());
	var detik 	= String(date.getSeconds()).length == 2 ? date.getSeconds() : '0'+String(date.getSeconds());
	var tanggalPenuh = th+'-'+bl+'-'+tg+' '+jam+'.'+menit+'.'+detik; 
	callback(tanggalPenuh);
}

function getGambar(ip,ipl,logid){
		var camera  = new MjpegCamera({
			url 	: 'http://'+ip+':8080/?action=stream'
		});
		//camera.start();
		camera.getScreenshot(function(err,frame){
			if (err) {
				saveLog(err);
			}else{
				tanggal(function(data){
					//img = 'camera/'+logid+'-'+data+'.jpg';
					fs.writeFileSync('camera/'+logid+'-'+data+'.jpg',frame);
					logger(ipl,'camera/'+logid+'-'+data+'.jpg');
					camera.start();
					camera.stop();
				})
			}
		});

}

function waktu(){
	var date 	= new Date();
	var jam 	= String(date.getHours()).length == 2 ? date.getHours() : '0'+String(date.getHours());
	var menit 	= String(date.getMinutes()).length == 2 ? date.getMinutes() : '0'+String(date.getMinutes());
	//var detik 	= String(date.getSeconds()).length == 2 ? date.getSeconds() : '0'+String(date.getSeconds());
	var jamPenuh= jam+':'+menit+':00'; 
	return jamPenuh;
}


setInterval(function(){
	jadwal(function(data){ //Get jadwal
		for (var i = 0; i < data.length; i++) {
			if (data[i].jamawal==waktu()) {
				ping.sys.probe(data[i].iplogger,function(hidup){
					if (hidup==false) {
						console.log(data[i].iplogger+' - Tidak terhubung');
					}else{
						getGambar(data[i].ipcam,data[i].iplogger,data[i].loggerid);
					}
				})
			};
		};
	}); //End get jadwal
//router.get('/get/cam1',new MjpegProxy('http://cam:123@10.10.1.1:8080/?action=stream').proxyRequest);
},60*1000);


////function get logger
function logger(ip,img){
	request({
		url : 'http://'+ip,
		json: true
	},function(err,res,body){
		if (!err) {
			var loggerid = body.logger_id;
			var psi = body.psi_in;
			pool.getConnection(function(err,con){
				if (err) {
					saveLog(err);
				}else{
					pool.query("insert into datalog_tmp values('',?,?,?,?,?,now())",[loggerid,psi,0,0,img],function(err,row,field){
						if (err) {
							saveLog(err);
						};
					})
				}
				con.release();
			})
		}else{
			saveLog('Tidak bisa terhubung ke logger '+ip);
		}
	});
}
////End function

//Function savelog
function saveLog(text){
	pool.getConnection(function(err,con){
		if (err) {
			console.log({
				'teks' : 'Tidak bisa koneksi ke database GIS',
				'error' : err
			})
		}else{
			pool.query("insert into logs values('',?,now())",[teks],function(err,row,field){
				if (err) {
					console.log({
						'teks':'Tidak bisa memasukan data ke table logs',
						'error':err
					})
				};
			})
		}
		con.release();
	})	
}
//End function save log
