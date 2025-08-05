const validator = require('@app-core/validator');
const sendViaProvider = require('./email-provider');

const sendEmailSpec = `root {
  template is a required string
  recipient is a required email
  subject is a string
  logKey is a string
}`;
const parsedSpec = validator.parse(sendEmailSpec);

/**
 * Send an email
 * @param {{template:String,recipient:String,subject:[String],logKey:[String]}} serviceData
 */
function sendEmail(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);

  sendViaProvider({
    recipient: data.recipient,
    subject: data.subject || 'EMAIL',
    emailContent: data.template,
    logKey: data.logKey,
  });
}

module.exports = sendEmail;
