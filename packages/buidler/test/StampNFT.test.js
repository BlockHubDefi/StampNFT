const StampNFT = artifacts.require('StampNFT');
const { constants } = require('ethers');
const ZERO = constants.AddressZero;
const log = console.log;

const IpfsHttpClient = require('ipfs-http-client');
const { globSource, urlSource } = IpfsHttpClient;
// Let's use the public infura node for now:
const ipfs = IpfsHttpClient({ host: 'ipfs.infura.io', port: '5001', protocol: 'https' });

describe('StampNFT', async () => {
  let accounts;
  let stampNFT;
  let IPFS_CID = [];

  before(async () => {
    accounts = await web3.eth.getAccounts();
  });

  describe('Deployment', async () => {
    it('deploy StampNFT contract', async () => {
      stampNFT = await StampNFT.new();
    });

    it('set the right owner for the StampNFT contract', async () => {
      assert.equal(await stampNFT.owner(), accounts[0]);
    });

  });

  describe('IPFS', async () => {
    let tmpNFTData = {
      'name': '',
      'description': '.',
      // No need for this in our standard // 'image': ''
      'file_hash': '', // Will store the hash of the file as a fingerprint
      'IPFS_data': '', // Will store the IPFS hash storing the original file
      // No need for this in our standard // 'attributes': {}
      'encrypted': '', // Will allow us to know if the file needs to be decrypted or not on our dapp
    };
    let tmpNFTData_2 = {
      'name': '',
      'description': '.',
      'file_hash': '',
      'IPFS_data': '',
      'encrypted': '',
    };

    it('can prepare 2 NFTs metadata', async () => {
      tmpNFTData.name = Math.random().toString(36).substr(2, 10);
      tmpNFTData.description = Math.random().toString(36).substr(2, 10);
      tmpNFTData.file_hash = Math.random().toString(36).substr(2, 10);
      tmpNFTData.IPFS_data = Math.random().toString(36).substr(2, 10);
      tmpNFTData.encrypted = 'false';
      log(`NFT metadata created:`);
      log(tmpNFTData);
      assert.isNotEmpty(tmpNFTData);

      tmpNFTData_2.name = Math.random().toString(36).substr(2, 10);
      tmpNFTData_2.description = Math.random().toString(36).substr(2, 10);
      tmpNFTData_2.file_hash = Math.random().toString(36).substr(2, 10);
      tmpNFTData_2.IPFS_data = Math.random().toString(36).substr(2, 10);
      tmpNFTData_2.encrypted = 'false';
      log(`NFT metadata created:`);
      log(tmpNFTData_2);
      assert.isNotEmpty(tmpNFTData_2);
    });

    it('can upload NFTs metadata to IPFS', async () => {
      // For file from URL: ipfs.add(urlSource('https://ipfs.io/images/ipfs-logo.svg')))
      for await (const file of ipfs.add(JSON.stringify(tmpNFTData))) {
        assert.isNotEmpty(file.path);
        IPFS_CID.push(file.path);
        assert.isNotEmpty(IPFS_CID);
      }
      for await (const file of ipfs.add(JSON.stringify(tmpNFTData_2))) {
        assert.isNotEmpty(file.path);
        IPFS_CID.push(file.path);
        assert.isNotEmpty(IPFS_CID);
      }
    }).timeout(50000); // Must be added to avoid a timeout when using IPFS
  });

  describe('NFT management', async () => {
    it('create new NFTs', async () => {
      const receiptNFT = await stampNFT.createItem(accounts[0], IPFS_CID[0]);
      assert.isNotEmpty(receiptNFT);
      log(`Minted NFT with IPFS hash ${IPFS_CID[0]}`);
      // Uncomment to see the receipt: log(`tx receipt of the NFT created: ${JSON.stringify(receiptNFT)}`);

      const receiptNFT2 = await stampNFT.createItem(accounts[1], IPFS_CID[1]);
      assert.isNotEmpty(receiptNFT2);
      log(`Minted NFT with IPFS hash ${IPFS_CID[1]}`);
      // Uncomment to see the receipt: log(`tx receipt of the NFT created: ${JSON.stringify(receiptNFT2)}`);
    });

    it('check the NFT balance of the accounts', async () => {
      const NFTbalance_account0 = await stampNFT.balanceOf(accounts[0]);
      assert.isAbove(parseInt(NFTbalance_account0), 0, 'Balance should not be empty');
      log(`NFT balance of ${accounts[0]}: ${NFTbalance_account0} NFT(s)`);
      
      const NFTbalance_account1 = await stampNFT.balanceOf(accounts[1]);
      assert.isAbove(parseInt(NFTbalance_account1), 0, 'Balance should not be empty');
      log(`NFT balance of ${accounts[1]}: ${NFTbalance_account1} NFT(s)`);
    });

    it('retrieve the id of the NFTs owned', async () => {
      const tokenID = await stampNFT.tokenOfOwnerByIndex(accounts[0], 0);
      assert.isAbove(parseInt(tokenID), 0, 'tokenID should be above 0');
      log(`tokenID of ${accounts[0]} for index 0: ${tokenID}`);
      const URIOfNFT = await stampNFT.tokenURI(tokenID);
      assert.isNotEmpty(URIOfNFT);
      log(`TokenURI inside the NFT of id ${tokenID} of account ${accounts[0]}: ${URIOfNFT}`);

      const tokenID2 = await stampNFT.tokenOfOwnerByIndex(accounts[1], 0);
      assert.isAbove(parseInt(tokenID2), 0, 'tokenID should be above 0');
      log(`tokenID of ${accounts[1]} for index 0: ${tokenID2}`);
      const URIOfNFT2 = await stampNFT.tokenURI(tokenID2);
      assert.isNotEmpty(URIOfNFT2);
      log(`TokenURI inside the NFT of id ${tokenID2} of account ${accounts[1]}: ${URIOfNFT2}`);

    });
  });
});
