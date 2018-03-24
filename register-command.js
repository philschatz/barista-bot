// Modified from https://github.com/probot/commands/blob/master/index.js
class CommandResponse {
  constructor(previousMessageToken, text, options) {
    this.previousMessageToken = previousMessageToken
    this.text = text
    this.options = options
  }

  getMarkdown () {
    if (this.options) {
      return `${this.text}

---
${this.getOptionsMarkdown()}
`
    } else {
      return this.text
    }
  }

  getOptionsMarkdown () {
    if (this.options.attachments) {
      return this.options.attachments.map((attachment) => {
        const {type, color, text, value /*for a button*/, options /*for a select*/} = attachment
        if (type === 'button') {
          return `[${text}](http://localhost:3000/commands/github?state=${encodeURIComponent(JSON.stringify(value))})`
        } else if (type === 'select') {
          const optionsMarkdown = options.map((option) => {
            return `- [${option.text}](http://localhost:3000/commands/github?state=${encodeURIComponent(JSON.stringify(option.value))})`
          }).join('\n')
          return `${text} _(select one of the following)_\n\n${optionsMarkdown}\n`
        } else {
          throw new Error('unsupported')
        }
      }).join(' ')
    }
  }
}

class CommandObj {
  constructor (context) {
    this.context = context
    this.state = null
  }

  getState() {
    return this.state
  }

  createResponse (text, options) {
    return new CommandResponse(null, text, options)
  }

  editResponse (previousMessageToken, text, options) {
    return new CommandResponse(previousMessageToken, text, options)
  }

  finish (previousMessageToken, text, options) {
    return new CommandResponse(previousMessageToken, text, options)
  }

  async extendState(obj) {
    return Object.assign({}, this.state, obj)
  }

  _setState(obj) {
    this.state = obj
  }
}


class Command {
  constructor (name, callback) {
    this.name = name
    this.callback = callback
    this.previousMessageToken = null
    this.commandObj = new CommandObj()

  }

  get matcher () {
    return /^\/([\w]+)\b *(.*)?$/m
  }

  async listener (context) {
    const command = context.payload.comment.body.match(this.matcher)

    if (command && this.name === command[1]) {
      THE_CURRENT_COMMAND = {context, command: this} // so we have the github connection
      await this.exec(context, command[2], this.commandObj.state)
    }
  }

  async exec (context, args, state) {
    this.commandObj.state = state
    this.commandObj.context = context
    const response = await this.callback(this.commandObj, args, context, this.previousMessageToken)
    if (response) {
      let issue
      const body = response.getMarkdown()
      if (response.previousMessageToken) {
        issue = await context.github.issues.editComment(context.repo({id: this.previousMessageToken, body: body}))
      } else {
        issue = await context.github.issues.createComment(context.issue({body: body}))
      }
      this.previousMessageToken = issue.data.id
    }
  }
}

// This is a lookup for the web callbacks so that the state changes when the user clicks on a link
let THE_CURRENT_COMMAND = null

module.exports = (robot, {name, action}) => {
  const command = new Command(name, action)
  robot.on('issue_comment.created', command.listener.bind(command))

  // TODO: Only do the following once
  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/commands')
  // Add a new route
  app.get('/github', async (req, res) => {
    const state = JSON.parse(req.query.state)
    await THE_CURRENT_COMMAND.command.exec(THE_CURRENT_COMMAND.context, null, state)

    res.redirect(THE_CURRENT_COMMAND.context.payload.comment.html_url)
  })

}

module.exports.Command = Command
