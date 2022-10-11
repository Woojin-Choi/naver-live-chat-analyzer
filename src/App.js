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
// import { Chart } from "react-charts";
import { Line } from "react-chartjs-2";

function App() {
  const [videoLink, setVideoLink] = useState("");
  const [validRawChat, setValidRawChat] = useState([]);
  const [chatFrequency, setChatFrequency] = useState([]);

  const onYoutubeLinkInputChange = (e) => {
    setVideoLink(e.target.value);
  };

  const onYoutubeLinkInputButtonClick = () => {
    let totalCommentNum = 0;
    let totalRawChat = [];

    getShoppingChatting(totalCommentNum, totalRawChat);
  };

  const convertSecToHhmmssStr = (timeSec) => {
    return new Date(timeSec * 1000).toISOString().substr(11, 8);
  };

  const getShoppingChatting = async (
    totalCommentNum,
    totalRawChat,
    lastCreatedAtMilli = 0
  ) => {
    // let finalResult;

    // https://shoppinglive.naver.com/replays/689216?fm=shoppinglive&sn=home

    let videoIdRegExp = /\d{6,}/;

    let isUrlValid = videoIdRegExp.test(videoLink);
    if (!isUrlValid) {
      alert("입력된 링크가 올바르지 않습니다.\n링크를 확인해주세요.");
      return;
    }

    let videoId = videoIdRegExp.exec(videoLink)[0];

    //   const requestSize = 100;
    // const videoId = "676501"; //689216 681068 676501
    const groupIntervalSec = 5;
    try {
      // https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/681068?needTimeMachine=true
      const broadcastRaw = await axios.get(
        `https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/${videoId}`
      );

      const broadcastEndDate = broadcastRaw.data.endDate;
      const differenceTravel =
        new Date(broadcastRaw.data.endDate).getTime() -
        new Date(broadcastRaw.data.startDate).getTime();

      // console.log(broadcastRaw.data.startDate, broadcastRaw.data.endDate);
      const durationSec = Math.floor(differenceTravel / 1000);
      // console.log(durationSec);

      // https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/689216/replays/comments?includeBeforeComment=true&lastCreatedAtMilli=3696001&size=100
      const res = await axios.get(
        `https://apis.naver.com/live_commerce_web/viewer_api_web/v1/broadcast/${videoId}/replays/comments`,
        {
          params: {
            lastCreatedAtMilli: lastCreatedAtMilli,
            //   size: requestSize,
          },
        }
      );

      // console.log("res", res.data);
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
        //   console.log("totalRawChat", totalRawChat);
        console.log("totalCommentNum", totalCommentNum);

        const validRawChat = totalRawChat.filter(
          (chat) => chat.createdAtMilli > 0 && chat.createdAt < broadcastEndDate
        );
        console.log("validRawChat", validRawChat);
        setValidRawChat(validRawChat);

        let chattingFrequencyData = { x: [], y: [], formattedX: [] };
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

          // chattingFrequencyData.push({
          //   // timeStr: new Date(groupSec * 1000).toISOString().substr(11, 8),
          //   x: groupSec,
          //   y: thisRangeInfo.length,
          // });

          // console.log(groupSec, thisRangeInfo.length);
        }

        console.log("chattingFrequencyData", chattingFrequencyData);
        setChatFrequency(chattingFrequencyData);

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

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Chart.js Line Chart",
      },
    },
  };

  const labels = chatFrequency ? chatFrequency.formattedX : [];

  const data = {
    labels,
    datasets: [
      {
        label: "Dataset 1",
        data: chatFrequency ? chatFrequency.y : [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

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
        <Line options={options} data={data} />
      </div>
      <div className="chatBoxContainer">
        <div className="chatBox">
          {validRawChat
            ? validRawChat.map((chat) => {
                return (
                  <div className="chatLine">
                    <div>
                      {convertSecToHhmmssStr(chat.createdAtMilli / 1000)}
                    </div>
                    {/* <div>{chat.nickname}</div> */}
                    <div>{chat.message}</div>
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
}

export default App;
