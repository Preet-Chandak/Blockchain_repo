import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import axios from 'axios';
import FileSharingContract from '../contracts/FileSharing.json';

const FileUpload = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [networkId, setNetworkId] = useState(null);
  const [sharedUser, setSharedUser] = useState('');
  const [sharedFileId, setSharedFileId] = useState(null);

  // Pinata credentials
  const PINATA_API_KEY = 'e968479e4647ad164b08';
  const PINATA_SECRET_KEY = '665ef984f1138a2c2b87c3d9602beba4d7139a81aa3a7bb64e4e0473eff7d4d4';

  useEffect(() => {
    const init = async () => {
      setError('');
      try {
        let web3Instance;

        // First, try to connect to Ganache
        try {
          web3Instance = new Web3('http://127.0.0.1:8545');
          await web3Instance.eth.net.isListening(); // Check connection to Ganache
        } catch (ganacheError) {
          console.log('Could not connect to Ganache, falling back to MetaMask');
          if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3Instance = new Web3(window.ethereum);
          } else {
            throw new Error('No Web3 provider found. Please install MetaMask or ensure Ganache is running.');
          }
        }

        setWeb3(web3Instance);

        // Get network ID
        const currentNetworkId = await web3Instance.eth.net.getId();
        setNetworkId(currentNetworkId);
        console.log('Connected to network ID:', currentNetworkId);

        // Get accounts
        const accounts = await web3Instance.eth.getAccounts();
        if (accounts.length === 0) {
          throw new Error('No accounts found. Please check your Web3 provider.');
        }
        setAccount(accounts[0]);
        console.log('Connected account:', accounts[0]);

        // Get contract instance
        const deployedNetwork = FileSharingContract.networks[currentNetworkId];
        if (!deployedNetwork) {
          throw new Error(`Contract not deployed on network ${currentNetworkId}. Please deploy your contract first.`);
        }

        const contractInstance = new web3Instance.eth.Contract(
          FileSharingContract.abi,
          deployedNetwork.address
        );
        setContract(contractInstance);
        await loadFiles(contractInstance);

        if (window.ethereum) {
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);
        }

      } catch (error) {
        console.error('Initialization Error:', error);
        setError(error.message || 'Failed to initialize application');
      }
    };

    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setError('Please connect to MetaMask.');
    } else {
      setAccount(accounts[0]);
      if (contract) {
        await loadFiles(contract);
      }
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const loadFiles = async (contractInstance) => {
    if (!contractInstance) {
      console.log('No contract instance available');
      return;
    }
  
    try {
      const fileCountBigInt = await contractInstance.methods.fileCount().call();
      const fileCount = Number(fileCountBigInt);
      
      const loadedFiles = [];
      
      for (let i = 1; i <= fileCount; i++) {
        const file = await contractInstance.methods.getFile(i).call();
        
        const uploadTime = new Date(Number(file[2]) * 1000).toLocaleString();
  
        loadedFiles.push({
          id: i,
          ipfsHash: file[0],
          fileName: file[1],
          uploadTime,
          uploader: file[3],
        });
      }
  
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files from blockchain');
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setFileName(event.target.files[0].name);
  };

  const uploadToPinata = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const options = {
      headers: {
        'Content-Type': `multipart/form-data;`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      },
    };

    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        options
      );
      return response.data.IpfsHash;
    } catch (error) {
      console.error('Pinata Error:', error);
      throw new Error('Failed to upload to IPFS via Pinata');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setUploadProgress(0);

    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!contract) {
      setError('Contract not initialized. Please check your network connection.');
      return;
    }

    try {
      setLoading(true);
      const ipfsHash = await uploadToPinata(file);

      await contract.methods.uploadFile(ipfsHash, fileName).send({
        from: account,
        gas: 3000000,
      });

      await loadFiles(contract);
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      event.target.reset();
    } catch (error) {
      console.error('Upload Error:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleShareFile = async (fileId) => {
    if (!sharedUser) {
      setError('Please enter a valid address to share the file with.');
      return;
    }
  
    try {
      await contract.methods.shareFile(fileId, sharedUser).send({ from: account });
      alert(`File shared successfully with ${sharedUser}`);
      setSharedUser('');
      setSharedFileId(null);
      loadFiles(contract);
    } catch (error) {
      console.error('Error sharing file:', error);
      setError('Failed to share file');
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">Upload File</h1>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white p-4 shadow-md rounded-lg max-w-lg mx-auto">
        <label className="block font-semibold mb-2">
          Choose File (Max 50MB)
          <input type="file" onChange={handleFileChange} className="block w-full mt-2 p-2 border rounded-lg" />
        </label>

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
          disabled={loading}
        >
          {loading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
        </button>
      </form>

      <div className="mt-8 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full table-fixed">
            <thead className="bg-gray-200">
              <tr>
                <th className="w-1/12 px-4 py-2">ID</th>
                <th className="w-5/12 px-4 py-2">File Name</th>
                <th className="w-1/4 px-4 py-2">Uploaded By</th>
                <th className="w-1/4 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b">
                  <td className="px-4 py-2">{file.id}</td>
                  <td className="px-4 py-2">{file.fileName}</td>
                  <td className="px-4 py-2">{file.uploader}</td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                      onClick={() => setSharedFileId(file.id)}
                    >
                      Share
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sharedFileId && (
        <div className="mt-4 max-w-lg mx-auto p-4 bg-white shadow-md rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Share File ID: {sharedFileId}</h3>

          <label className="block font-semibold mb-2">
            Recipient Address
            <input
              type="text"
              value={sharedUser}
              onChange={(e) => setSharedUser(e.target.value)}
              placeholder="Enter user address"
              className="block w-full mt-2 p-2 border rounded-lg"
            />
          </label>

          <button
            onClick={() => handleShareFile(sharedFileId)}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-700 mt-4"
          >
            Share File
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
