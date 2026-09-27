const recommendations = [
  {
    id: 1,
    name: "Kyaw Soe",
    role: "HR Manager, Myanmar Payroll & Outsourcing",
    quote: "Zin's attention to detail and commitment to accuracy makes payroll processing reliable and stress-free.",
  },
  {
    id: 2,
    name: "Su Kyi",
    role: "Founder, People Operations Institute",
    quote: "A thoughtful HR professional who brings structure and empathy to complex people operations.",
  },
  {
    id: 3,
    name: "Thant Zin",
    role: "Director, NearMe",
    quote: "Zin managed our HR operations with professionalism and genuine care for our team.",
  },
  {
    id: 4,
    name: "Aung Kyaw",
    role: "Finance Lead, Myanmar Payroll & Outsourcing",
    quote: "Reliable, detail-oriented, and always ready to support cross-functional teams.",
  },
  {
    id: 5,
    name: "Myo Thein",
    role: "Recruitment Specialist",
    quote: "Zin's structured approach to onboarding ensures no detail is missed.",
  },
];

export default function RecommendationsSection() {
  return (
    <section className="recommendations-section" id="recommendations">
      <div className="section-pad">
        <div className="section-heading">
          <p className="section-kicker">LinkedIn Recommendations</p>
          <h2>What people say</h2>
          <p>Trusted by HR and payroll professionals across Myanmar</p>
        </div>
        <div className="testimonials-grid">
          {recommendations.map((rec) => (
            <div key={rec.id} className="testimonial-card">
              <p className="quote">{rec.quote}</p>
              <div className="testimonial-footer">
                <p className="author">{rec.name}</p>
                <p className="role">{rec.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
