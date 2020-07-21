import React from 'react'
import { PageHeader } from 'antd';

export default function Header(props) {
  return (
    <div onClick={()=>{
      window.open("https://github.com/BlockHubDefi/StampNFT");
    }}>
      <PageHeader
        title="🖃 StampNFT"
        subTitle="Stamp your files and protect them 🔏"
        style={{cursor:'pointer'}}
      />
    </div>
  );
}
