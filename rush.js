var rest = require('restler'),
  lineReader = require('line-reader'),
  querystring = require('querystring'),
  _ = require('underscore');

var root = 'http://www.limesociety.com/princessrush/api/';

var reqData = {
  get_all: {
    url: 'get_all',
    obj: {}
  },
  start_stage: {
    url: 'start_stage',
    obj: {}
  },
  check_stage: {
    url: 'check_stage',
    obj: {}
  },
  finish_stage: {
    url: 'finish_stage',
    obj: {}
  }
};

var playLimit = 200;
var readyCount = 4;

function ready() {
  readRequestData('get_all');
  readRequestData('start_stage');
  readRequestData('check_stage');
  readRequestData('finish_stage');
}

function readRequestData(name) {
  var obj = reqData[name].obj;

  obj.headers = {};
  obj.data = {};

  var isMethod = true;
  var isHeader = true;

  lineReader.eachLine(name, function (line) {
    if (isMethod) {
      isMethod = false;
      return;
    }

    if (line === '') {
      isHeader = false;
      return;
    }

    if (isHeader) {
      var arr = line.split(': ');
      var key = arr[0];
      var value = arr[1];
      obj.headers[key] = value;
      return;
    }

    obj.data = querystring.parse(line);

  }).then(function () {
    readyCount--;

    if (readyCount === 0) {
      console.log('준비 완료!!');
      ping();
    }
  });
}

function ping() {
  request('get_all', function (data) {
    
    var hammerNumber = Number(data.user_data['i.hammerNumber']);  
    
    console.log('망치가 ' + hammerNumber + '개 남았다.');

    // 망치가 있으면 게임 시작!
    if (hammerNumber > 1) {
      console.log('게임을 시작해볼까!! ' + playLimit + '판 남았다.');
      startStage();
      return;
    }

    // 30초 뒤에 다시 시도한다.
    console.log('망치가 없다. 기다렸다 다시 하자.');
    setTimeout(ping, 1000 * 30);
  });
}

function startStage() {
  request('start_stage', function (data) {
    if (data.code === 1) {
      console.log('유후~ 시작한다!');
      checkStage();
    } else {
      console.log('게임 시작 중 오류.', data);
      console.log('10초 후 다시 시작해보자.');
      setTimeout(startStage, 1000);
    }
  });
}

function checkStage() {
  var interval = 20;
  request('check_stage', function (data) {
    if (data.code === 1) {
      console.log('유후~! 스테이지 체크 성공!');
      console.log('게임은 ' + interval + '초 간 진행한다.');
      setTimeout(finishStage, 1000 * interval);
    } else {
      console.log('음.. 스테이지 체크 중 오류.', data);
    }
  });
}

var tryFinishing = 0;
function finishStage() {
  request('finish_stage', function (data) {
    if (data.code === 1) {
      console.log('게임 종료! 수고했다!');
      console.log('총 골드: ' + data.gold);
      tryFinishing = 0;
      playLimit--;

      if (playLimit > 0) {
        console.log('한 판 더 할까~?');
        setTimeout(ping, 1000);
      } else {
        console.log('오늘 충분히 했다. 이제 그만~');
      }

    } else {
      tryFinishing++;

      if (tryFinishing > 10) {
        console.log('실패를 너무 했다. 이쯤에서 그만하자..');
      } else {
        console.log('게임 종료 요청에서 오류... 다시 시도한다.', tryFinishing);

        setTimeout(finishStage, 3000);
      }
    }
  });
}

function request(name, callback) {
  var url = root + reqData[name].url;
  var obj = _.clone(reqData[name].obj);
  var req = rest.post(url, obj);
  req.on('complete', function (data) {
    callback(data);
  });
}


ready();