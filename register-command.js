// Modified from https://github.com/probot/commands/blob/master/index.js
const ROOT_URL = process.env['ROOT_URL'] || 'http://localhost:3000'

class CommandResponse {
  constructor(previousMessageToken, text, options) {
    this.previousMessageToken = previousMessageToken
    this.text = text
    this.options = options
  }

  getMarkdown (id) {
    if (this.options) {
      return `${this.text}

---
${this.getOptionsMarkdown(id)}
`
    } else {
      return this.text
    }
  }

  getOptionsMarkdown (id) {
    if (this.options.attachments) {
      return this.options.attachments.map((attachment) => {
        const {type, color, text, value /*for a button*/, options /*for a select*/} = attachment
        if (type === 'button') {
          return `[[${text}]](${ROOT_URL}/commands/github?id=${id}&state=${encodeURIComponent(JSON.stringify(value))})`
        } else if (type === 'select') {
          const optionsMarkdown = options.map((option) => {
            return `- [${option.text}](${ROOT_URL}/commands/github?id=${id}&state=${encodeURIComponent(JSON.stringify(option.value))})`
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
      const id = ('' + Math.random()).substring(2,8) // Generate a random ID for the command
      ACTIVE_COMMANDS[id] = {context, command: this} // so we have the github connection
      await this.exec(context, id, command[2], this.commandObj.state)
    }
  }

  async exec (context, id, args, state) {
    this.commandObj.state = state
    this.commandObj.context = context
    const response = await this.callback(this.commandObj, args, context, this.previousMessageToken)
    if (response) {
      let issue
      const body = response.getMarkdown(id)
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
const ACTIVE_COMMANDS = {}

module.exports = (robot, {name, action}) => {
  const command = new Command(name, action)
  robot.on('issue_comment.created', command.listener.bind(command))

  // TODO: Only do the following once
  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/commands')
  // Add a new route
  app.get('/github', async (req, res) => {
    const id = req.query.id
    const state = JSON.parse(req.query.state)
    const currentCommand = ACTIVE_COMMANDS[id]

    if (currentCommand) {
      const redirectUrl = currentCommand.context.payload.comment.html_url

      // Execute the command with the new state
      await currentCommand.command.exec(currentCommand.context, id, null, state)

      // Redirects are too slow for a new Edit to an existing message to pop up so
      // this hacky code waits a few seconds before redirecting back so GitHub
      // has time to update the Page.
      res.end(`<html><head><body>Thanks! Redirecting you back to <a href="${redirectUrl}">${redirectUrl}</a>... <script>window.setTimeout(function() { window.location.replace("${redirectUrl}") }, 1 * 1000) </script></body></html>`)

    } else {
      res.end('I am sorry but it seems that you took too long to finish ordering the coffee. You can try again by creating a comment that begins with /coffee')
    }

  })

}

module.exports.Command = Command
