import express from 'express';
import { AccountHistoryService } from './service/AccountService';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

const accountData = {
  accountSummary: {},
  accountHistory: [],
  isAccountLoaded: false,
};

const accountHistoryService = new AccountHistoryService({
  filePath: './data/sallie-mae.csv',
  headers: ['Date', 'Type', 'Amount', 'Fees', 'Principal', 'Interest'],
  delimiter: ',',
});

// add some logging to the server
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// serve data via API
app.get('/api/account-history', async (req, res) => {
  let summary = await accountHistoryService.getAccountSummary();
  res.send({ balance: summary.Balance });
});

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
  accountHistoryService.loadAccount().then((account) => {
    accountData.isAccountLoaded = true;
    accountData.accountSummary = account;
    accountData.accountHistory = account.History;
  });
});
