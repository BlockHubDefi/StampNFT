import React, { useState, useEffect } from 'react';
import 'antd/dist/antd.css';
import { ethers } from 'ethers';
import './App.css';
import { Row, Col, Input, Button, Spin, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { Transactor } from './helpers';
import { useExchangePrice, useGasPrice, useContractLoader, useContractReader } from './hooks';
import { Header, Account, Provider, Faucet, Ramp, Address, Contract } from './components';
import sha256 from 'crypto-js/sha256';

require('dotenv').config();

const { Dragger } = Upload;

const { BufferList } = require('bl');

const log = console.log;

const ipfsAPI = require('ipfs-http-client');
const ipfs = ipfsAPI({ host: 'ipfs.infura.io', port: '5001', protocol: 'https' })

const getFromIPFS = async hashToGet => {
  for await (const file of ipfs.get(hashToGet)) {
    log(file.path)
    if (!file.content) continue;
    const content = new BufferList()
    for await (const chunk of file.content) {
      content.append(chunk)
    }
    log(content)
    return content
  }
}

const addToIPFS = async fileToUpload => {
  for await (const result of ipfs.add(fileToUpload)) {
    return result
  }
}

// Change it later: 
const mainnetProvider = new ethers.providers.InfuraProvider('mainnet', '2717afb6bf164045b5d5468031b93f87')
const localProvider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : 'http://localhost:8545')

function App() {

  const [address, setAddress] = useState();
  const [injectedProvider, setInjectedProvider] = useState();
  const price = useExchangePrice(mainnetProvider)
  const gasPrice = useGasPrice('fast')

  const tx = Transactor(injectedProvider, gasPrice)

  const readContracts = useContractLoader(localProvider);
  const writeContracts = useContractLoader(injectedProvider);

  // Need to update that to display the user NFT(s) properly on the UI:
  const myAttestation = useContractReader(readContracts, 'Attestor', 'attestations', [address], 1777);

  const [data, setData] = useState()
  const [sending, setSending] = useState()
  const [loading, setLoading] = useState()
  const [ipfsHash, setIpfsHash] = useState()
  const [ipfsContents, setIpfsContents] = useState()
  const [attestationContents, setAttestationContents] = useState()

  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState();
  const [fileHash, setFileHash] = useState();
  const [uploadButtonHidden, setUploadButtonHidden] = useState(true);

  const asyncGetFile = async () => {
    let result = await getFromIPFS(ipfsHash)
    setIpfsContents(result.toString())
  }

  useEffect(() => {
    if (ipfsHash) asyncGetFile()
  }, [ipfsHash])

  let ipfsDisplay = ''
  if (ipfsHash) {
    if (!ipfsContents) {
      ipfsDisplay = (
        <Spin />
      )
    } else {
      ipfsDisplay = (
        <pre style={{ margin: 8, padding: 8, border: '1px solid #dddddd', backgroundColor: '#ededed' }}>
          {ipfsContents}
        </pre>
      )
    }
  }

  const asyncGetAttestation = async () => {
    let result = await getFromIPFS(myAttestation)
    setAttestationContents(result.toString())
  }

  useEffect(() => {
    if (myAttestation) asyncGetAttestation()
  }, [myAttestation])


  // Need to update that later . . .
  let attestationDisplay = ''
  if (myAttestation) {
    if (!attestationContents) {
      attestationDisplay = (
        <Spin />
      )
    } else {
      attestationDisplay = (
        <div>
          <Address value={address} /> attests to:
          <pre style={{ margin: 8, padding: 8, border: '1px solid #dddddd', backgroundColor: '#ededed' }}>
            {attestationContents}
          </pre>
        </div>

      )
    }
  }

  return (
    <div className='App'>
      <Header />
      <div style={{ position: 'fixed', textAlign: 'right', right: 0, top: 0, padding: 10 }}>
        <Account
          address={address}
          setAddress={setAddress}
          localProvider={localProvider}
          injectedProvider={injectedProvider}
          setInjectedProvider={setInjectedProvider}
          mainnetProvider={mainnetProvider}
          price={price}
        />
      </div>

      <div style={{ padding: 32, textAlign: 'left' }}>
        <Dragger
          fileList={fileList}
          beforeUpload={(file) => {
            // log(file);
            setFileList([file]);
            setUploadButtonHidden(false);

            // Hashing the file from the browser:
            var reader = new FileReader();
            reader.readAsBinaryString(file);

            // loader for the binary conversion of the file from the browser:
            reader.onload = function () {
              setFileHash(sha256(reader.result).toString());
            };
            // If an error occurs, show it:
            reader.onerror = function () {
              log(reader.error);
            };

            return false;
          }}
          onRemove={(file) => { setFileList([]); setUploadButtonHidden(true); }}
          multiple={false}
          /* action={async () => { log('bruh') }} */
          onChange={(info) => {
            // Temporarily removed
          }} >
          <p className='ant-upload-drag-icon'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text'>Drag and drop the file you wish to stamp to this area</p>
          <p className='ant-upload-hint'>
            Be aware, once the file has been stamped, its data cannot be deleted or removed from Ethereum.
          </p>
        </Dragger>

        <Button style={{ margin: 8 }} loading={sending} size='large' shape='round' type='primary' onClick={async () => {
          log('UPLOADING FILE TO IPFS...');
          setSending(true);
          setIpfsHash();
          setIpfsContents();

          log(fileList);
          log(fileHash);

          const IPFS_file = await addToIPFS(fileList);
          log(IPFS_file);

          const tmpNFTData = {
            'name': fileList[0].name,
            'description': fileList[0].type,
            'file_hash': fileHash,
            'IPFS_data': IPFS_file.path,
            'encrypted': 'false', // false by default for now . . .
          };

          const IPFS_metadata = await addToIPFS(JSON.stringify(tmpNFTData));
          log(IPFS_metadata.path);

          if (IPFS_metadata && IPFS_metadata.path) {
            setIpfsHash(IPFS_metadata.path);
          }
          
          // Minting the NFT to the user wallet for Proof-of-Ownership of the data:
          log(IPFS_metadata.path);
          tx(writeContracts['StampNFT'].createItem(address, IPFS_metadata.path));

          setSending(false);

        }}
        disabled={uploadButtonHidden}
        >Upload to IPFS and Stamp it!</Button>
      </div>

      <div style={{ padding: 32, textAlign: 'left' }}>
        IPFS Hash: <Input value={ipfsHash} onChange={(e) => {
          setIpfsHash(e.target.value)
        }} />
        {ipfsDisplay}
      </div>

      <div style={{ padding: 32, textAlign: 'left' }}>
        {attestationDisplay}
      </div>

        <h2>StampNFT solUI:</h2>
      <div style={{padding:64,textAlign: 'left'}}>
        <Contract
          name={'StampNFT'}
          provider={injectedProvider}
          address={address}
        />
      </div>

      <div style={{ position: 'fixed', textAlign: 'right', right: 0, bottom: 20, padding: 10 }}>
        <Row align='middle' gutter={4}>
          <Col span={10}>
            <Provider name={'mainnet'} provider={mainnetProvider} />
          </Col>
          <Col span={6}>
            <Provider name={'local'} provider={localProvider} />
          </Col>
          <Col span={8}>
            <Provider name={'injected'} provider={injectedProvider} />
          </Col>
        </Row>
      </div>
      <div style={{ position: 'fixed', textAlign: 'left', left: 0, bottom: 20, padding: 10 }}>
        <Row align='middle' gutter={4}>
          <Col span={9}>
            <Ramp
              price={price}
              address={address}
            />
          </Col>
          <Col span={15}>
            <Faucet
              localProvider={localProvider}
              price={price}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
