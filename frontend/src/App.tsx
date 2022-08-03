import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { GetBookURLButton } from './getBookURLButton';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import {Output} from './output';

function App() {
  const [output, setOutput] = useState(<Output type='info' msg='initial message' />);

  return (
    <div className="App">
      <div className='main-container'>
        <div className='header'>
          <WalletMultiButton />
          <WalletDisconnectButton />
        </div>
        <div className='body'>
          <GetBookURLButton setOutput={setOutput} />
        </div>

        <div>
          {output}
        </div>
      </div>
    </div>
  );
}

export default App;
