import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChattingGraph from "./ChattingGraph";
// import { Chart } from "react-charts";

// token frequency
const KoreanFirstableConsonant = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split(
  ""
);
const KoreanMiddlableVowel = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split(
  ""
);
const KoreanFinalableConsonant = [
  undefined,
  ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ".split(""),
];
const FirstSyllableForKorean = "가".charCodeAt();
const LastSyllableForKorean = "힣".charCodeAt();

const isKoreanSyllable = (char) => {
  // 음절인지?
  const charCode = char.charCodeAt();
  if (FirstSyllableForKorean <= charCode && charCode <= LastSyllableForKorean)
    return true;
  return false;
};

const decomposeSyllable = (syllable) => {
  // 음절 분해
  if (!isKoreanSyllable(syllable)) return syllable;

  const syllableCode = syllable.charCodeAt();
  return {
    first: KoreanFirstableConsonant[Math.floor((syllableCode - 0xac00) / 588)],
    middle:
      KoreanMiddlableVowel[Math.floor(((syllableCode - 0xac00) % 588) / 28)],
    final:
      KoreanFinalableConsonant[
        Math.floor(((syllableCode - 0xac00) % 588) % 28)
      ],
  };
};

const arrangeSyllableToPhoneme = (letter) => {
  // 음절을 음소로 나열
  if (!isKoreanSyllable(letter)) return letter;

  const disassedLetter = decomposeSyllable(letter);
  return (
    disassedLetter.first +
    disassedLetter.middle +
    (disassedLetter.final ? disassedLetter.final : "")
  );
};

const resolveDoubleVowel = (char) => {
  // 모음 분해
  const table = {
    ㅘ: "ㅗㅏ",
    ㅙ: "ㅗㅐ",
    ㅚ: "ㅗㅣ",
    ㅝ: "ㅜㅓ",
    ㅞ: "ㅜㅔ",
    ㅟ: "ㅜㅣ",
    ㅢ: "ㅡㅣ",
  };
  if (table[char] != undefined) return table[char];
  return char;
};

const resolveDoubleConsonant = (char) => {
  // 자음 분해
  const table = {
    ㄲ: "ㄱㄱ",
    ㄳ: "ㄱㅅ",
    ㄵ: "ㄴㅈ",
    ㄶ: "ㄴㅎ",
    ㄺ: "ㄹㄱ",
    ㄻ: "ㄹㅁ",
    ㄼ: "ㄹㅂ",
    ㄽ: "ㄹㅅ",
    ㄾ: "ㄹㅌ",
    ㄿ: "ㄹㅍ",
    ㅀ: "ㄹㅎ",
    ㅄ: "ㅂㅅ",
    ㅆ: "ㅅㅅ",
  };
  if (table[char] != undefined) return table[char];
  return char;
};

const arrangeLineToPhoneme = (
  line,
  resolveConsonant = false,
  resolveVowel = false,
  joinSpace = false
) => {
  // 문장을 음소로 나열
  let result = line
    .split("")
    .map((dl) => arrangeSyllableToPhoneme(dl))
    .join("");
  if (resolveVowel)
    result = result
      .split("")
      .map((dl) => resolveDoubleVowel(dl))
      .join("");
  if (resolveConsonant)
    result = result
      .split("")
      .map((dl) => resolveDoubleConsonant(dl))
      .join("");
  if (joinSpace) result = result.split(" ").join("");
  return result;
};

const rangeTokenCounter = (
  textArray,
  frequentWordNum = Infinity,
  exception = ["ㅋ"],
  whenProjectOpen = true
) => {
  if (whenProjectOpen) {
    console.log("start analyzing and downloading total chatting...");
  }
  const rateSame = 0.7;

  let newTextArray = JSON.parse(JSON.stringify(textArray));
  newTextArray.map((text, i) => {
    exception.map((excep) => {
      newTextArray[i] = text.split(excep).join(" ");
    });
  });
  // console.log('newTextArray: ', newTextArray);

  // let splitedTexts = [];
  // newTextArray.map(text => (splitedTexts = [...splitedTexts, ...text.split(' ')]));

  let splitedTexts = [];
  for (let word of newTextArray) {
    splitedTexts.push(...word.split(" "));
  }

  // console.log('splitedTexts', splitedTexts);

  let frequency = {};
  let similarTokens = {};
  for (let tokenIdx in splitedTexts) {
    let token = splitedTexts[tokenIdx];
    let progressPercent = parseInt(
      (Number(tokenIdx) / splitedTexts.length) * 100
    );
    if (
      whenProjectOpen &&
      parseInt((progressPercent - 1) / 10) !== parseInt(progressPercent / 10)
    ) {
      console.log("진행률", `${progressPercent} %`);
    }
    if (token.length === 0) continue;
    if (frequency[token] !== undefined) {
      frequency[token] += 1;
      similarTokens[token].find((a) => a[0] === token)[1] += 1;
    } else {
      const arrangedToken = arrangeLineToPhoneme(token);
      if (token.length === 1) {
        frequency[token] = 1;
        similarTokens[token] = [[token, 1]];
        continue;
      }

      let found = "";
      let existedTokens = Object.entries(frequency).map((a) => a[0]);
      for (let i = 0; i < existedTokens.length; i++) {
        const existed = existedTokens[i];
        if (existed.length === 1) continue;

        let arrangedExisted = arrangeLineToPhoneme(existed);
        let numSame = 0;
        let lenNew = arrangedToken.length;
        let lenExisted = arrangedExisted.length;
        for (let j = 0; j < Math.min(lenNew, lenExisted); j++) {
          if (arrangedToken[j] === arrangedExisted[j]) numSame++;
        }
        if (numSame / Math.min(lenNew, lenExisted) >= rateSame) {
          found = existed;
          break;
        }
      }

      if (found !== "") {
        frequency[found] += 1;

        if (similarTokens[found].findIndex((a) => a[0] === token) === -1) {
          similarTokens[found].push([token, 1]);
        } else {
          similarTokens[found].find((a) => a[0] === token)[1] += 1;
        }
      } else {
        frequency[token] = 1;
        similarTokens[token] = [[token, 1]];
      }
    }
  }

  Object.entries(frequency).map((keyVal) => {
    const key = keyVal[0];

    similarTokens[key].sort((a, b) => b[1] - a[1]);
    if (similarTokens[key][0][0] !== key) {
      const newKey = similarTokens[key][0][0];
      frequency[newKey] = frequency[key];
      similarTokens[newKey] = similarTokens[key];
      delete frequency[key];
      delete similarTokens[key];
    }
  });
  frequency = Object.fromEntries(
    Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, frequentWordNum)
  );

  // console.log({ textArray, frequency });

  return frequency;
};

const convertSecToHhmmssStr = (timeSec) => {
  return new Date(timeSec * 1000).toISOString().substr(11, 8);
};

const ChatBox = React.memo(({ chatBox }) => {
  return (
    <div className="chatBox">
      {chatBox
        ? chatBox.map((chat, idx) => {
            return (
              <div className="chatLine" key={`chatLink${idx}`}>
                <div>{convertSecToHhmmssStr(chat.createdAtMilli / 1000)}</div>
                <div>{`(${chat.nickname}) : `}</div>
                <div>{chat.message}</div>
              </div>
            );
          })
        : null}
    </div>
  );
});

const FrequentWordBox = React.memo(({ frequentWordInfoArr }) => {
  return (
    <div className="frequentWordBox">
      {frequentWordInfoArr.map((info, idx) => (
        <div className="frequentWordLine" key={`frequentWord${idx}`}>
          <div>{info[0]}</div>
          <div>{info[1]}</div>
        </div>
      ))}
    </div>
  );
});

function App() {
  const [videoLink, setVideoLink] = useState("");
  const [validRawChat, setValidRawChat] = useState([]);
  const [chatFrequency, setChatFrequency] = useState([]);
  const [frequentWordInfoArr, setFrequentWordInfoArr] = useState([]);
  const [customKeyword, setCustoomKeyword] = useState("");
  const [broadcastRaw, setBroadcastRaw] = useState({});
  const [chatBox, setChatBox] = useState([]);
  const [graphData, setGraphData] = useState({
    labels: [],
    datasets: [
      {
        label: "채팅 빈도",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  });

  const onYoutubeLinkInputChange = (e) => {
    setVideoLink(e.target.value);
  };

  const onYoutubeLinkInputButtonClick = () => {
    let totalCommentNum = 0;
    let totalRawChat = [];

    getShoppingChatting(totalCommentNum, totalRawChat);
  };

  const onKeywordInputChange = (e) => {
    setCustoomKeyword(e.target.value);
  };

  const onKeywordInputButtonClick = () => {
    const differenceTravel =
      new Date(broadcastRaw.endDate).getTime() -
      new Date(broadcastRaw.startDate).getTime();

    const durationSec = Math.floor(differenceTravel / 1000);
    const groupIntervalSec = 5;

    let newY = [];
    for (
      let groupSec = 0;
      groupSec < durationSec;
      groupSec += groupIntervalSec
    ) {
      const thisRangeInfo = validRawChat.filter(
        (chat) =>
          groupSec < chat.createdAtMilli / 1000 &&
          chat.createdAtMilli / 1000 < groupSec + groupIntervalSec &&
          chat.message.includes(customKeyword)
      );

      newY.push(thisRangeInfo.length);
    }

    let newGraphData = {
      labels: chatFrequency.formattedX,
      datasets: [
        {
          label: "채팅 빈도",
          data: newY,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    };

    setChatBox(
      validRawChat.filter((chat) => chat.message.includes(customKeyword))
    );
    setGraphData(newGraphData);
  };

  const getShoppingChatting = async (
    totalCommentNum,
    totalRawChat,
    lastCreatedAtMilli = 0
  ) => {
    let videoIdRegExp = /\d{6,}/;

    let isUrlValid = videoIdRegExp.test(videoLink);
    if (!isUrlValid) {
      alert("입력된 링크가 올바르지 않습니다.\n링크를 확인해주세요.");
      return;
    }

    let videoId = videoIdRegExp.exec(videoLink)[0];

    const groupIntervalSec = 5;
    try {
      const broadcastRaw = await axios.get(
        `https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/${videoId}`
      );

      setBroadcastRaw(broadcastRaw.data);

      const broadcastEndDate = broadcastRaw.data.endDate;
      const differenceTravel =
        new Date(broadcastRaw.data.endDate).getTime() -
        new Date(broadcastRaw.data.startDate).getTime();

      const durationSec = Math.floor(differenceTravel / 1000);

      const res = await axios.get(
        `https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/${videoId}/replays/comments`,
        {
          params: {
            lastCreatedAtMilli: lastCreatedAtMilli,
            //   size: requestSize,
          },
        }
      );

      totalCommentNum += res.data.comments.length;
      totalRawChat = totalRawChat.concat(res.data.comments);
      console.log(
        `get this clips (${res.data.comments.length}) successfully...`
      );

      if (res.data.hasNext) {
        await getShoppingChatting(
          totalCommentNum,
          totalRawChat,
          res.data.lastCreatedAtMilli
        );
      } else {
        console.log("totalCommentNum", totalCommentNum);

        const validRawChat = totalRawChat.filter(
          (chat) => chat.createdAtMilli > 0 && chat.createdAt < broadcastEndDate
        );
        console.log("validRawChat", validRawChat);
        setValidRawChat(validRawChat);

        let onlyCommentArr = [];
        for (let rawChat of validRawChat) {
          onlyCommentArr.push(rawChat.message);
        }
        console.log("onlyCommentArr", onlyCommentArr);

        const allChatFrequentWord = rangeTokenCounter(onlyCommentArr);

        const allChatFrequentWordArr = Object.entries(allChatFrequentWord).sort(
          (a, b) => {
            return b[1] - a[1];
          }
        );

        setFrequentWordInfoArr(allChatFrequentWordArr);

        console.log("allChatFrequentWordArr", allChatFrequentWordArr);

        let chattingFrequencyData = { x: [], y: [], formattedX: [] }; // x: interval sec, y: chat freq, formattedX: ex) 00:00:25
        for (
          let groupSec = 0;
          groupSec < durationSec;
          groupSec += groupIntervalSec
        ) {
          const thisRangeInfo = validRawChat.filter(
            (chat) =>
              groupSec < chat.createdAtMilli / 1000 &&
              chat.createdAtMilli / 1000 < groupSec + groupIntervalSec
          );

          chattingFrequencyData.x.push(groupSec);
          chattingFrequencyData.y.push(thisRangeInfo.length);
          chattingFrequencyData.formattedX.push(
            new Date(groupSec * 1000).toISOString().substr(11, 8)
          );
        }

        console.log("chattingFrequencyData", chattingFrequencyData);

        setChatFrequency(chattingFrequencyData);

        let newGraphData = {
          labels: chattingFrequencyData.formattedX,
          datasets: [
            {
              label: "채팅 빈도",
              data: chattingFrequencyData.y,
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.5)",
            },
          ],
        };

        setChatBox(validRawChat);
        setGraphData(newGraphData);

        // const book = xlsx.utils.book_new();

        // const rawChatJSON = xlsx.utils.json_to_sheet(totalRawChat);
        // const frequencyJSON = xlsx.utils.json_to_sheet(chattingFrequencyData);

        // xlsx.utils.book_append_sheet(book, rawChatJSON, "RawChat");
        // xlsx.utils.book_append_sheet(book, frequencyJSON, "frequency");
        // xlsx.writeFile(book, `shppping_${videoId}.xlsx`);
      }
    } catch (err) {
      console.log(`Error occurs while getting raw chat info: ${err}`);
      console.log(err);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === "Enter") {
      onKeywordInputButtonClick();
    }
  };

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  return (
    <div className="App">
      <div>
        <input
          className="mainPageLinkInput"
          onChange={onYoutubeLinkInputChange}
          value={videoLink}
          placeholder="네이버 라이브 쇼핑 링크를 입력해주세요."
        />
        <button
          className="mainPageLinkInputButton"
          onClick={onYoutubeLinkInputButtonClick}
        >
          입력 완료
        </button>
      </div>
      <div style={{ height: "500px" }}>
        <ChattingGraph data={graphData} />
      </div>
      <div onKeyPress={onKeyPress}>
        <input
          className="keywordInput"
          onChange={onKeywordInputChange}
          value={customKeyword}
          placeholder="필터링 단어를 입력해주세요."
        />
        <button
          className="keywordInputButton"
          onClick={onKeywordInputButtonClick}
        >
          적용하기
        </button>
      </div>
      <div className="bottomContainer">
        <ChatBox chatBox={chatBox} />
        <FrequentWordBox frequentWordInfoArr={frequentWordInfoArr} />
      </div>
    </div>
  );
}

export default App;
