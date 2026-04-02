
public class Cover2 {
	
	
	Coordinates2 dup=new Coordinates2() ;
	
	Coordinates2 covDup=new Coordinates2();
	
	
	public Cover2() {};
	
	
	
	
	
	public Cover2(Coordinates2 dupl, Coordinates2 covDupl)
		{
					this.dup=dupl;
					this.covDup=covDupl;
					
		
		}

	
	public Coordinates2 getDup()
	
		{
		
			return dup;				
						
				
		}
	
	
	public Coordinates2 getCovDup()
	
	{
	
		return covDup;				
					
			
	}
	
	
public void setCovDup(Coordinates2 dup, Coordinates2 covdup)
	
	{
	
		this.dup=dup;				
		this.covDup=covdup;		
			
	}
	
	
	
	public void updateDupCov(Coordinates2 co) // mettre a jour la duplication et sa couverture
	
	{
		
	
		if (dup.x==co.x)
			{
				if (dup.y==co.y) 
					{
						
						dup.setXY(-1, -1, 0);
						
						covDup.setXY(-1, -1, 0);
						
					}
			
				else 
					{
					
						
						dup.x=co.y-1; // dup.x=dup.x-co.value;
						
						dup.value=dup.value-co.value;
					
						covDup.x=covDup.x-co.value;
						
						covDup.value=covDup.value-co.value;
					
					}
				
			
			}
	
		else
			{
			
			
				dup.y=co.x+1; // dup.y=dup.y+co.val;
				
				dup.value=dup.value-co.value;
			
				covDup.y=covDup.y+co.value;
				covDup.value=covDup.value-co.value;
				
			}
		
	}
	
	
	
	
	
	
}
 