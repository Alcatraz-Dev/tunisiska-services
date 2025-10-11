import { FaUsers, FaBell, FaFileContract, FaShieldAlt, FaTaxi } from 'react-icons/fa'
import { CgMediaLive } from 'react-icons/cg'
import { MdOutlinePermMedia } from 'react-icons/md'
import { MdWeb } from 'react-icons/md'

export const Structure = (S: any) =>
  S.list()
    .title('Tunisiska Services')
    .items([
      S.listItem()
        .title(' Users')
        .icon(FaUsers)
        .child(S.documentList().title('All Users').filter('_type == "users"')),

      S.listItem()
        .title(' Taxi Orders')
        .icon(FaTaxi)
        .child(S.documentList().title('All Taxi Orders').filter('_type == "taxiOrder"')),

      S.listItem()
        .title(' Announcements')
        .icon(MdOutlinePermMedia)
        .child(S.documentList().title('All Announcements').filter('_type == "announcement"')),

      S.listItem()
        .title(' Live Status')
        .icon(CgMediaLive)
        .child(S.documentList().title('All Live Status').filter('_type == "liveStatus"')),

      S.listItem()
        .title(' Footer')
        .icon(MdWeb)
        .child(S.document().title('Footer Configuration').schemaType('footer').documentId('footer')),

      S.listItem()
        .title(' Terms of Service')
        .icon(FaFileContract)
        .child(S.document().title('Terms of Service').schemaType('terms').documentId('terms')),

      S.listItem()
        .title(' Privacy Policy')
        .icon(FaShieldAlt)
        .child(S.document().title('Privacy Policy').schemaType('policy').documentId('policy')),
    ])