# svatba
Svatební web

```
npm install
npm run dev
```

## Production use

If you want deploy your IMA.js application to production, the installation is
similar to the dev enviroment.

To install the IMA.js application, start by cloning your application git
repository on your production server:

```
git clone https://github.com/seznam/IMA.js-skeleton.git // use your application's repository
```

Switch to the cloned directory and run the following commands to set-up your
application - same as in the development mode:

```
npm install
npm run build
```

Now your server is ready for running the built IMA.js application.

You can run your application using the following command:

```
npm run start
```

Your application is running at [`http://localhost:3001/`](http://localhost:3001/)
(unless configured otherwise) now!

### Building for SPA deployment

It is also possible to deploy your IMA.js application as an SPA (single-page
application). To do that, run the following command to build your application:

```
npm run build:spa
```