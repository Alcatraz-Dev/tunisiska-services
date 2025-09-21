import { StructureBuilder as S } from 'sanity/desk';
import { FaUsers, FaBell, FaPlus, FaClipboard } from 'react-icons/fa';

export const Structure = (S: any) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Users')
        .icon(FaUsers)
        .child(
          S.documentList()
            .title('All Users')
            .filter('_type == "users"')
        ),
      S.listItem()
        .title('Notifications')
        .icon(FaBell)
        .child(
          S.documentList()
            .title('All Notifications')
            .filter('_type == "notification"')
        ),
    ]);