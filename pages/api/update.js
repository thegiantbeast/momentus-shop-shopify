import { buffer } from 'micro'
import nodemailer from 'nodemailer'
import { createAdminApiClient } from '@shopify/admin-api-client'
import * as emailTemplates from '../../email-templates'

const [storeDomain, accessToken] = process.env.SHOPIFY_AUTH.split(':')
const client = createAdminApiClient({
  apiVersion: '2024-01',
  storeDomain,
  accessToken
})

const [user, pass] = process.env.OUTLOOK_AUTH.split(':')
const transport = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  auth: { user, pass }
})

export default async (req, res) => {
  const body = (await buffer(req)).toString()
  const { admin_graphql_api_id, contact_email, name, note_attributes, tags, billing_address: { country_code } } = JSON.parse(body)
  const lang = country_code === 'PT' ? 'pt' : 'en'

  console.log(`Received hook for ${name}`);

  // no attachment, nothing to process at this point
  if (!note_attributes?.[0]?.value || tags.includes('Entregue')) return

  console.log(`Send ${name} email to ${contact_email} (${country_code} :: ${tags}) with ${note_attributes?.[0]?.value}`)

  const email = await transport.sendMail({
    from: '"Momentus Shop" <info@momentus.shop>',
    to: 'ricardo.ferreira@wizardformula.pt', //contact_email,
    bcc: 'info@momentus.shop',
    subject: `${emailTemplates[lang].subject} ${name}`,
    text: emailTemplates[lang].text,
    html: emailTemplates[lang].html,
    attachments: [
      ...emailTemplates[lang].attachments,
      {
        filename: `${name}.png`,
        path: note_attributes?.[0]?.value
      }
    ]
  })

  if (!email.messageId) {
    console.log('Error sending email: ', JSON.stringify(email, null, ' '))

    return await transport.sendMail({
      from: 'info@momentus.shop',
      to: 'info@momentus.shop',
      subject: `Houve um erro no email de ${name}`
    })
  }

  console.log('Email sent: ', email.messageId)

  const operation = `
    mutation OrderUpdate($input: OrderInput!) {
      orderUpdate(input: $input) {
        userErrors {
          field,
          message
        }
      }
    }
  `
  const { data, errors } = await client.request(operation, {
    variables: {
      input: {
        id: admin_graphql_api_id,
        tags: `${tags}, Entregue`
      }
    }
  })

  if (data?.userErrors || errors) {
    console.log('GraphQL errors: ', data?.userErrors, errors)

    return await transport.sendMail({
      from: 'info@momentus.shop',
      to: 'info@momentus.shop',
      subject: `Houve um erro ao actualizar a tag de ${name}`
    })
  }

  res.status(200).send('Ok')
}

export const config = {
  api: {
    bodyParser: false,
  },
}