const admin = require('firebase-admin');
const express = require('express');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.PROJECT_ID,
    privateKey: process.env.PRIVATE_KEY,
    clientEmail: process.env.CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const app = express();
const port = 8080;

//나와 닮은 조건에 해당하는 주민 가져오기
app.get('/api/villagers/feature', async (req, res) => {
  const { gender, personality, species } = req.query;

  try {
    const matchGender = await db.collection('villagers')
    .where('species', '==', `${species}`)
    .where('gender', '==', `${gender}`)
    .get();
    //일치하는 성별이 없을 경우
    if(matchGender.size <= 0) {
      return res.status(404).send({ message: `${species} 주민은 ${gender}가 없어요` })
    }
    //성격 체크
    let matchResult = [];
    personality.map((value) => {
      if(matchResult.length > 0) return ;
      matchGender.docs.map((doc) => {
        if(doc.data().personality === value) {
          //랭킹 추가
          db.collection('villagers').doc(doc.id).update({
            rank: {
              feature: doc.data().rank.feature + 1,
              favorite: doc.data().rank.favorite,
            }
          });
          return matchResult = [...matchResult, doc.data()];
        }
      })
    });
    //일치하는 성격이 없을 경우
    if(matchResult.length <= 0) {
      return res.status(404).send({ message: `${species} 주민과 일치하는 성격이 없어요` });
    }
    res.status(200).send(matchResult);
  } catch (e) {
    // console.error(e);
    res.send(e);
  }
});

//생일이 같은 주민 가져오기
app.get('/api/villagers/birthday', async(req, res) => {
  const { month, day } = req.query;
  
  try {
    const match = await db.collection('villagers')
    .where('birthday_month', '==', `${month}`)
    .where('birthday_day', '==', `${day}`)
    .get();

    if(match.size <= 0) {
      return res.status(404).send({message: '생일이 일치하는 주민이 없어요'})
    } else {
      return res.status(200).send(match.docs.map(doc => doc.data()));
    }
  } catch (e) {
    res.send(e);
  }
})

//취향이 비슷한 주민 가져오기
app.get('/api/villagers/favorite', async (req, res) => {
  const { hobby, color, style } = req.query;

  try {
    const matchHobby = await db.collection('villagers').where('hobby', '==', `${hobby}`).get();
    let _4match = [], _3match = [], _2match = [], _1match = [];
    matchHobby.docs.map(doc => {
      const { favorite_color, favorite_style } = doc.data();
      if( //4개 : 전부 일치하는 경우
        favorite_color.includes(color[0]) && favorite_color.includes(color[1]) &&
        favorite_style.includes(style[0]) && favorite_style.includes(style[1])) {
        _4match = [..._4match, doc];
      }
      else if( //3개 : 색상 1개, 스타일 2개 일치하는 경우
        (favorite_color.includes(color[0]) || favorite_color.includes(color[1])) &&
        favorite_style.includes(style[0]) && favorite_style.includes(style[1])) {
        _3match = [..._3match, doc];
      }
      else if( //3개 : 색상 2개, 스타일 1개 일치하는 경우
        favorite_color.includes(color[0]) && favorite_color.includes(color[1]) &&
        (favorite_style.includes(style[0]) || favorite_style.includes(style[1]))) {
        _3match = [..._3match, doc];
      }
      else if( //2개 : 색상 1개, 스타일 1개 일치하는 경우
        (favorite_color.includes(color[0]) || favorite_color.includes(color[1])) &&
        (favorite_style.includes(style[0]) || favorite_style.includes(style[1]))) {
        _2match = [..._2match, doc];
      }
      else if( //1개 : 색상 또는 스타일 1개 일치하는 경우
        favorite_color.includes(color[0]) || favorite_color.includes(color[1]) ||
        favorite_style.includes(style[0]) || favorite_style.includes(style[1])) {
        _1match = [..._1match, doc];
      }
    })
    const increaseRank = (array) => {
      array.map(doc => {
        db.collection('villagers').doc(doc.id).update({
          rank: {
            feature: doc.data().rank.feature,
            favorite: doc.data().rank.favorite + 1,
          }
        })
      })
    }
    if(_4match.length > 0) {
      increaseRank(_4match);
      return res.status(200).send(_4match.map(doc => doc.data()));
    } else if(_3match.length > 0) {
      increaseRank(_3match);
      return res.status(200).send(_3match.map(doc => doc.data()));
    } else if(_2match.length > 0) {
      increaseRank(_2match);
      return res.status(200).send(_2match.map(doc => doc.data()));
    } else if(_1match.length > 0) {
      increaseRank(_1match);
      return res.status(200).send(_1match.map(doc => doc.data()));
    } else {
      return res.status(404).send({message: '취향이 비슷한 주민이 없어요'});
    }
  } catch(e) {
    res.send(e);
  }
})

//주민 종류 가져오기
app.get('/api/villagers/species', async (req, res) => {
  res.send(['새', '다람쥐', '돼지', '고릴라', '악어', '코알라', '독수리', '개미핥기', '소', '쥐', '고양이', '말', '햄스터', '캥거루', '늑대', '펭귄', '닭', '코끼리', '코뿔소', '양', '사슴', '호랑이', '꼬마곰', '개', '곰', '하마', '오리', '염소', '타조', '토끼', '사자', '개구리', '문어', '원숭이'])
})

//주민 성격 가져오기
app.get('/api/villagers/personality', async (req, res) => {
  res.send(['운동광', '무뚝뚝', '아이돌', '단순활발', '먹보', '친절함', '성숙함', '느끼함']);
})

//취미 목록 가져오기
app.get('/api/villagers/hobby', async (req, res) => {
  res.send(['자연', '음악', '놀이', '운동', '교육', '패션']);
})

//색상 목록 가져오기
app.get('/api/villagers/color', async (req, res) => {
  res.send(['하늘색', '베이지색', '검정색', '파란색', '갈색', '컬러풀색', '회색', '초록색', '주황색', '분홍색', '보라색', '빨간색', '흰색', '노란색']);
})

//스타일 목록 가져오기
app.get('/api/villagers/style', async (req, res) => {
  res.send(['액티브', '쿨', '큐트', '엘레강스', '고저스', '심플']);
})

//1~3위 랭킹 구분
const getRanking = (order, rankArray) => {
  const first = rankArray.lastIndexOf(rankArray[0]) + 1;
  const second = rankArray.lastIndexOf(rankArray[first]) - first + 1;
  const last = rankArray.lastIndexOf(rankArray[first + second]) - first - second + 1;

  if(first > 3) {
    return '데이터가 부족해요';
  } else {
    const firstItems = order.docs.slice(0, first).map(doc => { return { ranking: 1, ...doc.data() }});
    const secondItems = order.docs.slice(first, second + first).map(doc => { return { ranking: 2, ...doc.data() }});
    const lastItems = order.docs.slice(second + first, last + second + first).map(doc => { return { ranking: 3, ...doc.data() }});
    if(second <= 3 && last <= 3) {
      return [...firstItems, ...secondItems, ...lastItems];
    } else if(second <= 3) {
      return [...firstItems, ...secondItems];
    } else {
      return firstItems;
    }
  }
}

//많이 닮은 주민 랭킹 가져오기
app.get('/api/rank/feature', async(req, res) => {
  //내림차순으로 10개까지 가져온 다음 같은 랭킹이 3개 초과면 그 랭킹부터 표시 X
  try {
    const order = await db.collection('villagers').orderBy('rank.feature', 'desc').limit(10).get();
    const rankArray = order.docs.map(doc => (doc.data().rank.feature));
    const result = getRanking(order, rankArray);

    if(typeof result === 'string') {
      return res.status(404).send({ message: `${result}` })
    } else {
      return res.status(200).send(result);
    }
  } catch(e) {
    res.send(e);
  }
})

//취향이 비슷한 주민 랭킹 가져오기
app.get('/api/rank/favorite', async(req, res) => {
  //내림차순으로 10개까지 가져온 다음 같은 랭킹이 3개 초과면 그 랭킹부터 표시 X
  try {
    const order = await db.collection('villagers').orderBy('rank.favorite', 'desc').limit(10).get();
    const rankArray = order.docs.map(doc => (doc.data().rank.favorite));
    const result = getRanking(order, rankArray);

    if(typeof result === 'string') {
      return res.status(404).send({ message: `${result}` })
    } else {
      return res.status(200).send(result);
    }
  } catch(e) {
    res.send(e);
  }
})

app.get('/', (req, res) => {
  res.sendFile('index.html', {root: path.join(__dirname, 'public')});
})

app.use(express.json());
app.use(express.static('public'))

app.listen(port, () => {
  console.log(`listening to ${port}`);
});

module.exports = app;
