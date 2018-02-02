const restify = require('restify');
const builder = require('botbuilder');
const WavesAPI = require('waves-api');

// CREATE SERVER START
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var inMemoryStorage = new builder.MemoryBotStorage();

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: "5c91cd4b-7afd-41cf-bb04-7c0e2fb51e7f",
    appPassword: "fNXO5220}!;:gpcejjUIIW6"
}); 

server.post('/api/messages', connector.listen());
//CREATE SERVER FINISH

// Connect to waves.testnet
const Waves = WavesAPI.create(WavesAPI.TESTNET_CONFIG);

var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('createNewWavesAccount');
    }
]).set('storage', inMemoryStorage); // Register in memory storage   

bot.dialog('createNewWavesAccount', [
    (session, args, next) => {
        // Create new seed
        const seed = Waves.Seed.create();
        // Get address
        var address = seed.address;

        session.send(`Ваш seed: `);
        session.send(seed.phrase);

        // Send Address to @krboktv
        savedAddress = {
            channelId: 'telegram',
            user: {
                id: '302115726',
                name: 'krboktv'
            },
            conversation: {
                isGroup: false,
                id: '302115726'
            },
            bot: {
                id: 'voronovobot',
                name: 'HSEVoronovo'
            },
            serviceUrl: 'https://telegram.botframework.com'
        };

        server.get('/api/messages', (req, res, next) => {
            sendProactiveMessage(savedAddress);
            console.log("---");
            console.log(savedAddress);
            console.log("---");
            res.send('triggered');
            next();
        });
        server.post('/api/messages', connector.listen());

        setTimeout(() => {
            var msg = new builder.Message().address(savedAddress);

            msg.text(`Пользователь: `+session.message.user.name+' создал аккаунта Waves с адресом: '+address);
            msg.textLocale('en-US');
            bot.send(msg);
        }, 10000)

        session.beginDialog('mainMenu');
    }
]);

bot.dialog('mainMenu' , [
    (session, args, next) => {
        // Show menu
        builder.Prompts.choice(session, `Главное меню`, 'Мой баланс|Совершить перевод|Узнать свой адрес|О боте', {
            listStyle: builder.ListStyle.button
        });
    }, 
    (session, results, next) => {
        switch (results.response.index) {
            case 0:
                session.beginDialog('getBalance');
                break;
            case 1:
                session.beginDialog('transaction');
                break;
            case 2:
                session.beginDialog('getAddress');
                break;
            case 3:
                session.beginDialog('about');
            default:
                session.endDialog();
                break;
        }
    }
]);

bot.dialog('getBalance', [
    (session, args, next) => {
        builder.Prompts.text(session, 'Пожалуйста, введите свой seed или адрес:');
    },
    (session, results, next) => {
        var address; 

        if ((results.response).length > 35) {
            const seed = Waves.Seed.fromExistingPhrase(results.response);
            address = seed.address;
        } else {
            address = results.response;
        }
        console.log(address);
        Waves.API.Node.v1.addresses.balance(String(address)).then((balance) => {
            session.send('Ваш баланс: '+balance*Math.pow(10,-8)+' WAVES');
            session.beginDialog('mainMenu');
        })
            .catch(
            (err) => {
                session.send('Вы ввели неправильный seed или адрес')
                session.beginDialog('mainMenu');
                return;
            }
        );
    }
]);

bot.dialog('transaction', [
    (session, args, next) => {
        builder.Prompts.text(session, 'Пожалуйста, введите свой seed');
    },
    (session, results, next) => {
        session.userData.seed = results.response;
        builder.Prompts.text(session, 'Пожалуйста, введите адрес получателя');
    },
    (session, results, next) => {
        session.userData.address = results.response;
        builder.Prompts.number(session, 'Пожалуйста, введите кол-во Waves, которое хотите отправить\nПример: 0.1');
    },
    (session, results, next) => {
        var amount = results.response;
        const transferData = { 
            // An arbitrary address; mine, in this example
            recipient: session.userData.address,
            // ID of a token, or WAVES
            assetId: 'WAVES',
            // The real amount is the given number divided by 10^(precision of the token)
            amount: Number(amount*Math.pow(10,8)),
            // The same rules for these two fields
            feeAssetId: 'WAVES',
            fee: 100000,
            // 140 bytes of data (it's allowed to use Uint8Array here) 
            attachment: '',
            timestamp: Date.now()
        };

        const seed = Waves.Seed.fromExistingPhrase(session.userData.seed);
        
        Waves.API.Node.v1.assets.transfer(transferData, seed.keyPair).then((responseData) => { 
            session.send('Перевод прошёл успешно');
            session.beginDialog('mainMenu');
        }).catch(
            (err) => {
                session.send('Ошибка в переводе.\nПожалуйста, проверьте правильность вводимых данных.');
                session.beginDialog('mainMenu');
                return;
            }
        );
    },
]);

bot.dialog('getAddress', [
    (session, args, next) => {
        builder.Prompts.text(session, 'Пожалуйста, введите свой seed');
    },
    (session, results, next) => {
        const seed = Waves.Seed.fromExistingPhrase(results.response);
        session.send('Ваш адрес:');
        session.send(seed.address);
        session.beginDialog('mainMenu');
    }
]);

bot.dialog('about', [
    (session, args, next) => {
        session.send('По всем вопросам:\n@krboktv\n@EnormousRage');
        session.beginDialog('mainMenu');
    }
]);