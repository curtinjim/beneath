import ActorList from './ActorList'

/**
 * SplitActorPage — full-width actor list page.
 *
 * Navigation to actor detail is handled by the router: clicking a row in
 * ActorList navigates to `/${endpoint}/${id}` via useNavigate.
 *
 * Props:
 *   endpoint    — API/route segment, e.g. "contacts" | "companies" | "governments"
 *   title       — Page heading, e.g. "Contacts"
 */

const TYPE_LABEL = {
  contacts:    'Person',
  companies:   'Company',
  governments: 'Government',
}

export default function SplitActorPage({ endpoint, title }) {
  const singularLabel = TYPE_LABEL[endpoint] ?? 'Record'

  return (
    <ActorList
      endpoint={endpoint}
      title={title}
      createLabel={`New ${singularLabel}`}
    />
  )
}
