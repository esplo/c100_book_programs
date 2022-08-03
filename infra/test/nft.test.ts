import { PublicKey } from '@solana/web3.js';
import { checkNFT } from '../lib/lambda/authorizer';

test('has NFT', async () => {
    const result = await checkNFT(
        'devnet',
        '6N6cb9L4nthtMNS8j5ih8gJduUGWt6GzHpStHL4nawJq',
        new PublicKey('2GYuN7YavzPyUkT45zrEFmbm3WQMeGhKH6c8psLpmXXe')
    );
    expect(result).toBe(true);
});