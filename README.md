# Sample bot for ordering coffee

This bot shows how Interactive Messages can be made in GitHub using [Probot](https://github.com/probot/probot).

It is just a simple barista that is invoked by commenting on an Issue with the text `/coffee`.

See [integrations/slack#433](https://github.com/integrations/slack/pull/433#issuecomment-371392146) for discussion on this approach.


# Try it out

Go to the [Test Issue](https://github.com/philschatz/barista-bot/issues/1) and **Create a comment** that begins with `/coffee`.

Or, you can [Install the barista-bot App](github.com/apps/barista-bot) on one of your repositories.

# Screencap

![barista-bot](https://user-images.githubusercontent.com/253202/37862009-8f46000e-2f1c-11e8-8020-a84bf304e697.gif)


# Design

### Structure of a Command

Commands can be declared like this:

```js
module.exports = (robot) => {
  registerCommand(robot, {
    name: 'coffee',
    action: async (command, args, context, previousMessageToken) => {
      const state = command.getState()

      // Using the current state, determine what to **return**. It can be:
      // - command.createResponse(text, slackInteractiveOptions)
      // - command.editResponse(previousMessageToken, text, interactiveOptions)
    }
  })
}
```

The optional `interactiveOptions` has the same structure as [Slack Interactive Messages](https://api.slack.com/interactive-messages). The `value` field is a string that represents what the state should become if the user presses the button and `command.getState()` will return that value.


# About

This bot is inspired by the [coffeebot example](https://github.com/slackapi/sample-message-menus-node) for using [Slack Interactive Messages](https://api.slack.com/interactive-messages)
