const path = require('path');

// Dev-only workaround: make POST /resultpage return index.html so the SPA can boot.
// CRA calls this function with an Express `app` in development.
module.exports = function (app) {
  app.post('/resultpage', (req, res) => {
    const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
    res.sendFile(indexPath);
  });
};
