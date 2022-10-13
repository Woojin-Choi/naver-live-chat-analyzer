import React, { useEffect } from "react";
import { Line } from "react-chartjs-2";

function ChattingGraph({ data }) {
  //   const chatData = JSON.parse(data);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "네이버 쇼핑 라이브 채팅 정보",
      },
    },
  };

  return <Line options={options} data={data} />;
}

export default React.memo(ChattingGraph);
