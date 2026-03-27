using ControlPlane.Agent.Models;

namespace ControlPlane.Agent.Services;

public interface IDomainClassifierService
{
    string NormalizeDomain(string input);
    Task<DomainClassificationResult> ClassifyAsync(string domain, CancellationToken cancellationToken = default);
}
