const registerCommand = require('./register-command')

module.exports = (robot) => {
  registerCommand(robot, {
    name: 'coffee',
    usage: 'coffee',
    description: 'Order a coffee',
    action: async (command, args, context, previousMessageToken) => {
      const state = command.getState()
      if (!state) {
        return command.createResponse('I am coffeebot and I am here to take your order. What would you like to do?', {
          attachments: [
            {
              type: 'button',
              color: '#5A352D',
              text: 'Start a coffee order',
              // value is what is sent from Slack to us when the user clicks this button. It is a token (hash) that points to the new state
              value: await command.extendState({orderStep: 'LOAD_OPTIONS'})
            }
          ]
        });

      } else if (state['orderStep'] === 'LOAD_OPTIONS') {
        // This edits the current message instead of creating a new one
        return command.editResponse(previousMessageToken, 'Great! What can I get started for you?', {
          attachments: [
            {
              type: 'select',
              text: 'Select the type of coffee you would like to order',
              options: [
                { text: 'Cappuccino', value: await command.extendState({orderStep: 'CHOOSE_MILK', coffeeType: 'cappuccino'}) },
                { text: 'Americano',  value: await command.extendState({orderStep: 'CHOOSE_MILK', coffeeType: 'americano'}) },
              ]
            }
          ]
        })
      } else if (state['orderStep'] === 'CHOOSE_MILK') {
        return command.editResponse(previousMessageToken, 'What type of milk would you like?', {
          attachments: [
            {
              type: 'select',
              text: 'Select the type of milk you want',
              options: [
                { text: 'Skim', value: await command.extendState({orderStep: 'FINISH', milkType: 'skim'}) },
                { text: '2%',   value: await command.extendState({orderStep: 'FINISH', milkType: '2%'}) },
                { text: 'Soy',  value: await command.extendState({orderStep: 'FINISH', milkType: 'soy'}) },
              ]
            }
          ]
        })
      } else {
        // clear the state upon sending this message because we are done.
        return command.finish(previousMessageToken, `Your ${state['coffeeType']} with ${state['milkType']} milk is ready!`)
      }
    }
  })
}
