import { useParams } from "react-router-dom";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="page">
      <h1 className="page__title">Ticket-Detail</h1>
      <p className="page__text">
        {id
          ? `Die Detailansicht für Ticket ${id} wird in einem folgenden Ticket umgesetzt.`
          : "Die Detailansicht wird in einem folgenden Ticket umgesetzt."}
      </p>
    </section>
  );
}
